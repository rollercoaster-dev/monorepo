#!/usr/bin/env bun
/**
 * Claude Knowledge MCP Server
 *
 * Exposes knowledge graph, code graph, and checkpoint workflow functionality
 * as native Claude Code tools via Model Context Protocol.
 *
 * This server provides:
 * - Tools for querying and storing knowledge
 * - Tools for code graph analysis (callers, blast radius, find)
 * - Tools for checkpoint workflow management
 * - Resources for browsing learnings, patterns, logs, and workflows
 *
 * Configuration: Add to .mcp.json at project root
 * Transport: stdio (required for Claude Desktop)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "@rollercoaster-dev/rd-logger";
import { getDatabase } from "../db/sqlite.js";
import { tools, handleToolCall } from "./tools/index.js";
import { resources, readResource } from "./resources/index.js";

const logger = new Logger();

const SERVER_NAME = "claude-knowledge";
const SERVER_VERSION = "0.1.0";

/**
 * Create and configure the MCP server instance.
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("[mcp-server] Listing tools", { count: tools.length });
    return { tools };
  });

  // Handle tool invocations
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug("[mcp-server] Tool call", { name, args });

    const result = await handleToolCall(
      name,
      (args as Record<string, unknown>) || {},
    );
    return result;
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("[mcp-server] Listing resources", { count: resources.length });
    return { resources };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.debug("[mcp-server] Resource read", { uri });

    const result = await readResource(uri);
    if ("error" in result) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: JSON.stringify({ error: result.error }),
          },
        ],
      };
    }
    return result;
  });

  return server;
}

/**
 * Main entry point - starts the MCP server with stdio transport.
 */
async function main(): Promise<void> {
  logger.info(`Starting ${SERVER_NAME} MCP server v${SERVER_VERSION}`);

  const server = createServer();
  const transport = new StdioServerTransport();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down...");
    await server.close();
    process.exit(0);
  });

  // Periodically checkpoint WAL to prevent unbounded growth.
  // The MCP server holds the DB connection open for its entire lifetime,
  // which prevents automatic WAL checkpointing. PASSIVE mode checkpoints
  // without blocking readers or writers.
  const WAL_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const walCheckpointTimer = setInterval(() => {
    try {
      const db = getDatabase();
      db.run("PRAGMA wal_checkpoint(PASSIVE)");
    } catch (error) {
      logger.warn("WAL checkpoint failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, WAL_CHECKPOINT_INTERVAL_MS);
  walCheckpointTimer.unref();

  await server.connect(transport);
  logger.info("MCP server connected and ready");
}

// Run if executed directly (Bun entry point check)
if (import.meta.main) {
  main().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}

// Export for testing
export { createServer, SERVER_NAME, SERVER_VERSION };
