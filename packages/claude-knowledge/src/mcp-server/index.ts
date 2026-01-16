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

// Tool and resource registries will be imported once implemented
// import { tools, handleToolCall } from "./tools/index.js";
// import { resources, handleResourceRead } from "./resources/index.js";

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
    logger.debug("[mcp-server] Listing tools");
    // Will return actual tools once implemented
    return { tools: [] };
  });

  // Handle tool invocations
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug(`Tool call: ${name}`, args);

    // Will dispatch to actual handlers once implemented
    return {
      content: [
        {
          type: "text",
          text: `Tool '${name}' not yet implemented`,
        },
      ],
      isError: true,
    };
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("Listing resources");
    // Will return actual resources once implemented
    return { resources: [] };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.debug(`Resource read: ${uri}`);

    // Will dispatch to actual handlers once implemented
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Resource '${uri}' not yet implemented`,
        },
      ],
    };
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

  await server.connect(transport);
  logger.info("MCP server connected and ready");
}

// Run if executed directly
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

// Export for testing
export { createServer, SERVER_NAME, SERVER_VERSION };
