import type { Learning, Pattern, Mistake, Topic } from "../types";

/**
 * Sample learnings for testing various scenarios
 */
export const sampleLearnings: Learning[] = [
  {
    id: "learning-1",
    content: "Always validate user input with schema validation",
    confidence: 0.95,
    codeArea: "Security",
  },
  {
    id: "learning-2",
    content: "Use rd-logger for structured logging",
    confidence: 0.9,
    codeArea: "Logging",
  },
  {
    id: "learning-3",
    content: "Test async functions with proper error handling",
    confidence: 0.85,
    codeArea: "Testing",
    filePath: "src/test/utils.ts",
  },
  {
    id: "learning-4",
    content: "Database transactions ensure atomicity",
    confidence: 0.92,
    codeArea: "Database",
  },
  {
    id: "learning-5",
    content: "TypeScript strict mode catches more errors",
    confidence: 0.88,
    codeArea: "TypeScript",
  },
];

/**
 * Sample patterns for testing pattern storage and queries
 */
export const samplePatterns: Pattern[] = [
  {
    id: "pattern-1",
    name: "Input Validation",
    description: "Validate all user input with Zod schemas",
    codeArea: "Security",
  },
  {
    id: "pattern-2",
    name: "Structured Logging",
    description: "Use rd-logger with consistent log levels",
    codeArea: "Logging",
  },
  {
    id: "pattern-3",
    name: "Error Handling",
    description: "Wrap async operations in try-catch blocks",
    codeArea: "Error Handling",
  },
];

/**
 * Sample mistakes for testing mistake storage and queries
 */
export const sampleMistakes: Mistake[] = [
  {
    id: "mistake-1",
    description: "No input validation on API endpoint",
    howFixed: "Added Zod schema validation",
    filePath: "src/api/users.ts",
  },
  {
    id: "mistake-2",
    description: "SQL injection vulnerability in query",
    howFixed: "Used parameterized queries",
    filePath: "src/db/queries.ts",
  },
  {
    id: "mistake-3",
    description: "Unhandled promise rejection",
    howFixed: "Added try-catch and error logging",
    filePath: "src/services/data.ts",
  },
];

/**
 * Sample topics for testing topic storage and queries
 */
export const sampleTopics: Topic[] = [
  {
    id: "topic-1",
    content: "Worked on authentication system",
    keywords: ["auth", "login", "security"],
    timestamp: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "topic-2",
    content: "Database optimization and indexing",
    keywords: ["db", "performance", "indexes"],
    timestamp: "2024-01-10T11:00:00.000Z",
  },
  {
    id: "topic-3",
    content: "Testing infrastructure improvements",
    keywords: ["test", "ci", "coverage"],
    timestamp: "2024-01-10T12:00:00.000Z",
  },
];

/**
 * Mock embeddings data for semantic search tests
 */
export const mockEmbeddings = {
  learning1: Array(1536).fill(0.1),
  learning2: Array(1536).fill(0.2),
  learning3: Array(1536).fill(0.3),
  query: Array(1536).fill(0.15),
};
