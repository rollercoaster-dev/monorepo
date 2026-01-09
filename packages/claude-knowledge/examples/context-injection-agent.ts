/**
 * Example: Context Injection Agent
 *
 * Demonstrates how to use knowledge.formatForContext() to inject
 * relevant knowledge into an agent's context before executing a task.
 *
 * This example shows a simulated "Security Review Agent" that:
 * 1. Receives a file to review
 * 2. Queries the knowledge graph for relevant security learnings
 * 3. Formats the knowledge for prompt injection
 * 4. Uses the context to inform its review
 *
 * Run this example:
 *   bun packages/claude-knowledge/examples/context-injection-agent.ts
 */

import { Logger } from "@rollercoaster-dev/rd-logger";
import { knowledge } from "../src/index";
import { resetDatabase, closeDatabase } from "../src/db/sqlite";

const logger = new Logger({ context: "context-injection-example" });

// ============================================================================
// Example Configuration
// ============================================================================

const EXAMPLE_FILE = "src/api/users.ts";
const EXAMPLE_TASK = "Review this file for security vulnerabilities";

// ============================================================================
// Seed Example Data
// ============================================================================

async function seedExampleData(): Promise<void> {
  logger.info("Seeding example knowledge data...");

  // Store some security-related learnings
  await knowledge.store([
    {
      id: "learning-sql-1",
      content:
        "Always use parameterized queries to prevent SQL injection attacks",
      codeArea: "Security",
      filePath: "src/db/queries.ts",
      confidence: 0.95,
      sourceIssue: 100,
    },
    {
      id: "learning-validation-1",
      content:
        "Validate all user input at API boundaries using Zod or similar schema validation",
      codeArea: "Security",
      filePath: "src/api/users.ts",
      confidence: 0.92,
      sourceIssue: 101,
    },
    {
      id: "learning-auth-1",
      content:
        "Never store passwords in plain text - use bcrypt with appropriate work factor",
      codeArea: "Security",
      filePath: "src/auth/passwords.ts",
      confidence: 0.98,
      sourceIssue: 102,
    },
    {
      id: "learning-xss-1",
      content:
        "Sanitize HTML output to prevent XSS attacks when rendering user-generated content",
      codeArea: "Security",
      confidence: 0.9,
      sourceIssue: 103,
    },
  ]);

  // Store a security pattern
  await knowledge.storePattern(
    {
      id: "pattern-input-validation",
      name: "Input Validation Pattern",
      description:
        "Validate all external input at system boundaries using schema validation (Zod), reject invalid input early, and never trust client-side validation alone.",
      codeArea: "Security",
    },
    ["learning-validation-1"],
  );

  // Store a past mistake
  await knowledge.storeMistake(
    {
      id: "mistake-user-input",
      description:
        "User input was passed directly to SQL query without sanitization",
      howFixed:
        "Implemented parameterized queries and added Zod schema validation at API entry points",
      filePath: "src/api/users.ts",
    },
    "learning-validation-1",
  );

  logger.info("Example data seeded successfully");
}

// ============================================================================
// Simulated Agent
// ============================================================================

interface AgentTask {
  filePath: string;
  taskDescription: string;
}

interface AgentResult {
  task: AgentTask;
  knowledgeContext: string;
  tokenCount: number;
  learningsUsed: number;
  simulatedResponse: string;
}

/**
 * Simulated Security Review Agent
 *
 * This demonstrates how an agent would use formatForContext()
 * to get relevant knowledge before performing its task.
 */
async function runSecurityReviewAgent(task: AgentTask): Promise<AgentResult> {
  logger.info("SECURITY REVIEW AGENT", {
    filePath: task.filePath,
    taskDescription: task.taskDescription,
  });

  // Step 1: Query knowledge with semantic search for security concepts
  logger.info("Step 1: Querying knowledge graph...");

  const securityKnowledge = await knowledge.formatForContext(
    "security vulnerabilities input validation SQL injection XSS",
    {
      format: "markdown",
      useSemanticSearch: true,
      maxTokens: 1500,
      confidenceThreshold: 0.5,
      showFilePaths: true,
      context: {
        primaryCodeArea: "Security",
        modifiedFiles: [task.filePath],
      },
    },
  );

  // Step 2: Also get file-specific knowledge (mistakes in this file)
  logger.info("Step 2: Getting file-specific context...");

  const fileKnowledge = await knowledge.formatForContext(
    { filePath: task.filePath },
    {
      format: "bullets",
      maxTokens: 500,
    },
  );

  // Combine contexts
  const combinedContext = `
## Security Knowledge

${securityKnowledge.content}

## File-Specific History

${fileKnowledge.content}
`.trim();

  // Step 3: Simulate agent prompt construction
  logger.info("Step 3: Constructing agent prompt...");

  // In real usage, this prompt would be sent to an LLM
  const _agentPrompt = `
You are a security review agent. Review the following file for security vulnerabilities.

${combinedContext}

## Your Task

File to review: ${task.filePath}
${task.taskDescription}

Based on the knowledge above, identify potential security issues and suggest fixes.
`;

  // Step 4: Simulate agent response (in real usage, this would call an LLM with _agentPrompt)
  const simulatedResponse = `
## Security Review: ${task.filePath}

Based on the knowledge context provided, here are potential security concerns:

### 1. Input Validation (High Priority)
The file should implement Zod schema validation for all user inputs.
Reference: Learning from issue #101 recommends validating at API boundaries.

### 2. SQL Injection Prevention
Ensure all database queries use parameterized queries.
Past mistake in this file: User input was previously passed directly to SQL.

### 3. Recommendations
- Add Zod schemas for request body validation
- Review all database queries for parameterization
- Apply the "Input Validation Pattern" at all entry points

Token usage: ~${securityKnowledge.tokenCount + fileKnowledge.tokenCount} tokens of context
Learnings referenced: ${securityKnowledge.resultCount + fileKnowledge.resultCount}
  `.trim();

  return {
    task,
    knowledgeContext: combinedContext,
    tokenCount: securityKnowledge.tokenCount + fileKnowledge.tokenCount,
    learningsUsed: securityKnowledge.resultCount + fileKnowledge.resultCount,
    simulatedResponse,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  logger.info("CONTEXT INJECTION EXAMPLE");

  // Use a test database
  const TEST_DB = ".claude/example-knowledge.db";
  resetDatabase(TEST_DB);

  try {
    // Seed example data
    await seedExampleData();

    // Run the agent
    const result = await runSecurityReviewAgent({
      filePath: EXAMPLE_FILE,
      taskDescription: EXAMPLE_TASK,
    });

    // Display results
    logger.info("AGENT RESULT", {
      simulatedResponse: result.simulatedResponse,
    });

    // Show statistics
    logger.info("STATISTICS", {
      totalTokensUsed: result.tokenCount,
      learningsReferenced: result.learningsUsed,
    });

    // Show the raw context that was injected
    logger.info("RAW KNOWLEDGE CONTEXT", {
      knowledgeContext: result.knowledgeContext,
    });
  } finally {
    closeDatabase();
  }

  logger.info("Example complete!");
}

// Run the example
main().catch((error) => {
  logger.error("Example failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
