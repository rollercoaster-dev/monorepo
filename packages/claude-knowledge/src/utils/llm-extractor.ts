/**
 * LLM-based learning extraction from conversation transcripts.
 *
 * Uses Gemini 2.0 Flash via OpenRouter to extract technical insights
 * from session transcripts that aren't captured by commit parsing.
 *
 * Cost: ~$0.0013 per extraction (well under $0.01 target)
 */

import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import type { Learning } from "../types";
import { randomUUID } from "crypto";
import { findTranscriptByTimeRange } from "./transcript";
import { readFileSync } from "fs";

/** LLM-extracted learnings have lower confidence than manual (but higher than commit-based) */
const LLM_EXTRACT_CONFIDENCE = 0.8;

/** Gemini model via OpenRouter (2.5 Flash is fast and cheap) */
const LLM_MODEL = process.env.LLM_EXTRACTOR_MODEL || "google/gemini-2.5-flash";

/** Timeout for LLM API calls (30 seconds) - prevents session hooks from hanging */
const LLM_FETCH_TIMEOUT_MS = 30_000;

/**
 * Extraction prompt that focuses on technical insights.
 * Excludes generic advice and information already in commits.
 */
const EXTRACTION_PROMPT = `You are analyzing a conversation between a developer and an AI assistant.
Extract technical insights that would be valuable for future sessions.

Focus on:
- Problems discovered and how they were solved
- Non-obvious techniques or patterns used
- Gotchas and pitfalls encountered
- Debugging insights
- Design decisions and their rationale

Do NOT extract:
- Generic advice or explanations
- Information already captured in commit messages
- File paths or code snippets without context

Return a JSON array of learnings with this structure:
[
  {
    "content": "CSS custom properties don't work with SVG fill in Safari",
    "codeArea": "frontend/styling",
    "confidence": 0.8
  }
]

Return an empty array if no meaningful learnings are found.`;

/**
 * Parse a JSONL transcript file into conversation text.
 *
 * @param transcriptPath - Path to JSONL transcript file
 * @returns Formatted conversation text
 */
function parseTranscript(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const lines = content.trim().split("\n");

    const messages: string[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          type: string;
          message: { role: string; content: unknown };
        };

        const role = entry.message.role;
        let text = "";

        // Extract text from content (may be string or array)
        if (typeof entry.message.content === "string") {
          text = entry.message.content;
        } else if (Array.isArray(entry.message.content)) {
          // Content blocks - extract text blocks
          for (const block of entry.message.content) {
            if (
              typeof block === "object" &&
              block !== null &&
              "type" in block &&
              block.type === "text" &&
              "text" in block &&
              typeof block.text === "string"
            ) {
              text += block.text + "\n";
            }
          }
        }

        if (text.trim()) {
          messages.push(`${role}: ${text.trim()}`);
        }
      } catch (error) {
        // Skip malformed lines
        logger.debug("Skipped malformed transcript line", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return messages.join("\n\n");
  } catch (error) {
    logger.warn("Failed to parse transcript", {
      error: error instanceof Error ? error.message : String(error),
      transcriptPath,
    });
    return "";
  }
}

/**
 * Extract learnings from session transcripts using LLM.
 *
 * Finds all transcripts modified within the session time range and
 * extracts technical insights from them.
 *
 * @param startTime - Session start time
 * @param endTime - Session end time
 * @returns Array of extracted learnings (empty if extraction fails)
 *
 * @example
 * ```typescript
 * const start = new Date('2026-01-25T10:00:00Z');
 * const end = new Date('2026-01-25T11:00:00Z');
 * const learnings = await extractLearningsFromTranscript(start, end);
 * // Returns Learning[] with confidence 0.8
 * ```
 */
export async function extractLearningsFromTranscript(
  startTime: Date,
  endTime: Date,
): Promise<Learning[]> {
  // Get API key (fail silently if not configured)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.debug("OPENROUTER_API_KEY not set, skipping LLM extraction", {
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
    });
    return [];
  }

  // Find transcripts in time range
  const transcriptPaths = await findTranscriptByTimeRange(startTime, endTime);
  if (transcriptPaths.length === 0) {
    logger.debug(
      "No transcripts found in time range, skipping LLM extraction",
      {
        timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      },
    );
    return [];
  }

  // Parse all transcripts and combine
  let combinedText = "";
  for (const transcriptPath of transcriptPaths) {
    const text = parseTranscript(transcriptPath);
    if (text) {
      combinedText += text + "\n\n---\n\n";
    }
  }

  if (!combinedText || combinedText.trim().length === 0) {
    logger.debug("Empty transcripts, skipping LLM extraction", {
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      transcriptCount: transcriptPaths.length,
    });
    return [];
  }

  // Call OpenRouter API with timeout to prevent session hooks from hanging
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_FETCH_TIMEOUT_MS);

  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://rollercoaster.dev",
        "X-Title": "claude-knowledge",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: combinedText },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    // Handle timeout separately from other network errors
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("LLM extraction timed out", {
        timeoutMs: LLM_FETCH_TIMEOUT_MS,
        timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      });
      return [];
    }
    // Network error - log warning and return empty array
    logger.warn("LLM extraction network error", {
      error: error instanceof Error ? error.message : String(error),
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
    });
    return [];
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle API errors
  if (!response.ok) {
    const status = response.status;
    let errorMessage = `LLM extraction API error (${status})`;

    if (status === 401) {
      errorMessage = "LLM extraction failed: Invalid API key";
    } else if (status === 429) {
      errorMessage = "LLM extraction failed: Rate limit exceeded";
    } else if (status === 500 || status === 502 || status === 503) {
      errorMessage = `LLM extraction failed: Service error (${status})`;
    }

    logger.warn(errorMessage, {
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      status,
    });
    return [];
  }

  // Parse response
  let data: {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    data = (await response.json()) as typeof data;
  } catch (error) {
    logger.warn("LLM extraction: Failed to parse response JSON", {
      error: error instanceof Error ? error.message : String(error),
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
    });
    return [];
  }

  // Extract content from response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    logger.warn("LLM extraction: No content in response", {
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
    });
    return [];
  }

  // Parse learnings from JSON
  try {
    // Extract JSON from markdown code blocks if present
    let jsonText = content.trim();
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }

    const extracted = JSON.parse(jsonText) as Array<{
      content: string;
      codeArea?: string;
      confidence?: number;
    }>;

    if (!Array.isArray(extracted)) {
      logger.warn("LLM extraction: Response is not an array", {
        timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      });
      return [];
    }

    // Convert to Learning objects
    const learnings: Learning[] = [];
    for (const item of extracted) {
      // Skip items with missing, non-string, or whitespace-only content
      if (
        !item.content ||
        typeof item.content !== "string" ||
        !item.content.trim()
      ) {
        continue;
      }

      const learningId = `learning-llm-${randomUUID()}`;
      learnings.push({
        id: learningId,
        content: item.content,
        codeArea: item.codeArea,
        confidence: LLM_EXTRACT_CONFIDENCE,
        metadata: {
          source: "llm-extracted",
          model: LLM_MODEL,
          timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
        },
      });
    }

    logger.debug("LLM extraction completed", {
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      transcriptCount: transcriptPaths.length,
      extractedCount: learnings.length,
    });

    return learnings;
  } catch (error) {
    logger.warn("LLM extraction: Failed to parse learnings JSON", {
      error: error instanceof Error ? error.message : String(error),
      timeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
      content: content.substring(0, 200), // Log first 200 chars for debugging
    });
    return [];
  }
}
