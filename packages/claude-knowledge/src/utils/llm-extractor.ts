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
import { getTranscriptPath } from "./transcript";
import { readFileSync } from "fs";

/** LLM-extracted learnings have lower confidence than manual (but higher than commit-based) */
const LLM_EXTRACT_CONFIDENCE = 0.8;

/** Gemini 2.0 Flash model via OpenRouter (free tier) */
const LLM_MODEL = "google/gemini-2.0-flash-exp:free";

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
 * Extract learnings from a session transcript using LLM.
 *
 * @param sessionId - Session identifier
 * @returns Array of extracted learnings (empty if extraction fails)
 *
 * @example
 * ```typescript
 * const learnings = await extractLearningsFromTranscript("session-abc-123");
 * // Returns Learning[] with confidence 0.8
 * ```
 */
export async function extractLearningsFromTranscript(
  sessionId: string,
): Promise<Learning[]> {
  // Get API key (fail silently if not configured)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.debug("OPENROUTER_API_KEY not set, skipping LLM extraction", {
      sessionId,
    });
    return [];
  }

  // Get transcript path
  const transcriptPath = getTranscriptPath(sessionId);
  if (!transcriptPath) {
    logger.debug("Transcript not found, skipping LLM extraction", {
      sessionId,
    });
    return [];
  }

  // Parse transcript
  const transcriptText = parseTranscript(transcriptPath);
  if (!transcriptText || transcriptText.length === 0) {
    logger.debug("Empty transcript, skipping LLM extraction", {
      sessionId,
      transcriptPath,
    });
    return [];
  }

  // Call OpenRouter API
  let response: Response;
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
          { role: "user", content: transcriptText },
        ],
      }),
    });
  } catch (error) {
    // Network error - log warning and return empty array
    logger.warn("LLM extraction network error", {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
    });
    return [];
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

    logger.warn(errorMessage, { sessionId, status });
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
      sessionId,
    });
    return [];
  }

  // Extract content from response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    logger.warn("LLM extraction: No content in response", { sessionId });
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
      logger.warn("LLM extraction: Response is not an array", { sessionId });
      return [];
    }

    // Convert to Learning objects
    const learnings: Learning[] = [];
    for (const item of extracted) {
      if (!item.content || typeof item.content !== "string") {
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
          sessionId,
        },
      });
    }

    logger.debug("LLM extraction completed", {
      sessionId,
      extractedCount: learnings.length,
    });

    return learnings;
  } catch (error) {
    logger.warn("LLM extraction: Failed to parse learnings JSON", {
      error: error instanceof Error ? error.message : String(error),
      sessionId,
      content: content.substring(0, 200), // Log first 200 chars for debugging
    });
    return [];
  }
}
