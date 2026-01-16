/**
 * Output MCP Tools
 *
 * Provides the output_save tool for the "output-to-files" pattern.
 * Long outputs are saved to files and a summary is returned instead,
 * reducing context window usage while preserving full content.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { Buffer } from "node:buffer";

/**
 * Default output directory relative to working directory.
 */
const DEFAULT_OUTPUT_DIR = ".claude/output";

/**
 * Tool definitions for output operations.
 */
export const outputTools: Tool[] = [
  {
    name: "output_save",
    description:
      "Save long output to a file and return a summary. " +
      "Use for large outputs that would consume too much context. " +
      "Returns the file path and a summary (first + last lines).",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The content to save",
        },
        filename: {
          type: "string",
          description:
            "Filename to save as (e.g., 'test-output.txt', 'build-log.txt')",
        },
        summary: {
          type: "string",
          description:
            "Optional custom summary. If not provided, auto-generates from first/last lines.",
        },
        directory: {
          type: "string",
          description: `Optional output directory. Defaults to '${DEFAULT_OUTPUT_DIR}'`,
        },
      },
      required: ["content", "filename"],
    },
  },
];

/**
 * Generate an auto-summary from content.
 * Takes first 5 lines and last 5 lines, with line count info.
 */
function generateAutoSummary(content: string): string {
  const lines = content.split("\n");
  const totalLines = lines.length;

  if (totalLines <= 15) {
    // Short enough to include entirely
    return content;
  }

  const firstLines = lines.slice(0, 5);
  const lastLines = lines.slice(-5);

  return [
    `[${totalLines} lines total]`,
    "",
    "First 5 lines:",
    ...firstLines,
    "",
    "...",
    "",
    "Last 5 lines:",
    ...lastLines,
  ].join("\n");
}

/**
 * Handle output tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result with content
 */
export async function handleOutputToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (name) {
      case "output_save": {
        const content = args.content as string;
        const filename = args.filename as string;

        if (!content) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "content is required" }),
              },
            ],
            isError: true,
          };
        }

        if (!filename) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "filename is required" }),
              },
            ],
            isError: true,
          };
        }

        // Sanitize filename to prevent path traversal
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

        const directory =
          (args.directory as string) || join(process.cwd(), DEFAULT_OUTPUT_DIR);
        const filePath = join(directory, sanitizedFilename);

        // Ensure directory exists
        await mkdir(dirname(filePath), { recursive: true });

        // Write content to file
        await writeFile(filePath, content, "utf-8");

        // Generate or use provided summary
        const summary =
          (args.summary as string) || generateAutoSummary(content);
        const lineCount = content.split("\n").length;
        const byteSize = Buffer.byteLength(content, "utf-8");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  saved: true,
                  path: filePath,
                  filename: sanitizedFilename,
                  lineCount,
                  byteSize,
                  summary,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown output tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
}
