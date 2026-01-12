import { getDatabase } from "../db/sqlite";
import type { Learning, Pattern, Mistake, Topic } from "../types";
import { randomUUID } from "crypto";
// Buffer import needed for ESLint - it's also global in Bun runtime
import { Buffer } from "buffer";
import { defaultLogger as logger } from "@rollercoaster-dev/rd-logger";
import {
  createOrMergeEntity,
  generateEmbedding,
  createRelationship,
} from "./helpers";
import type { Database } from "bun:sqlite";

/**
 * Execute a database operation within a transaction.
 * Handles BEGIN, COMMIT, and ROLLBACK automatically.
 *
 * @param db - The database connection
 * @param operation - Function to execute within the transaction
 * @param context - Context string for error logging
 * @throws Error if the operation or rollback fails
 */
function withTransaction(
  db: Database,
  operation: () => void,
  context: string,
): void {
  db.run("BEGIN TRANSACTION");

  try {
    operation();
    db.run("COMMIT");
  } catch (error) {
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      logger.error("CRITICAL: ROLLBACK failed after transaction error", {
        originalError: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        context,
      });
    }
    throw new Error(
      `Failed in ${context}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Store learnings in the knowledge graph.
 *
 * Creates Learning entities and auto-creates/merges related CodeArea and File entities.
 * Establishes ABOUT and IN_FILE relationships.
 * Generates embeddings for semantic search.
 *
 * @param learnings - Array of learnings to store
 * @throws Error if storage fails (transaction is rolled back)
 */
export async function store(learnings: Learning[]): Promise<void> {
  if (learnings.length === 0) {
    return;
  }

  const db = getDatabase();

  // Generate embeddings before starting transaction (async operations)
  const embeddings = await Promise.all(
    learnings.map((learning) => generateEmbedding(learning.content)),
  );

  // Use transaction for batch insert efficiency and atomicity
  withTransaction(
    db,
    () => {
      for (let i = 0; i < learnings.length; i++) {
        const learning = learnings[i];
        const embedding = embeddings[i];

        // Ensure learning has an ID
        const learningId = learning.id || `learning-${randomUUID()}`;

        // Create Learning entity with embedding
        createOrMergeEntity(
          db,
          "Learning",
          learningId,
          {
            ...learning,
            id: learningId,
          },
          embedding,
        );

        // Auto-create/merge CodeArea entity if specified
        if (learning.codeArea) {
          const codeAreaId = `codearea-${learning.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
          createOrMergeEntity(db, "CodeArea", codeAreaId, {
            name: learning.codeArea,
          });

          // Create ABOUT relationship
          createRelationship(db, learningId, codeAreaId, "ABOUT");
        }

        // Auto-create/merge File entity if specified
        if (learning.filePath) {
          // Buffer is global in Bun
          const fileId = `file-${Buffer.from(learning.filePath).toString("base64url")}`;
          createOrMergeEntity(db, "File", fileId, {
            path: learning.filePath,
          });

          // Create IN_FILE relationship
          createRelationship(db, learningId, fileId, "IN_FILE");
        }
      }
    },
    "knowledge.store",
  );
}

/**
 * Store a pattern in the knowledge graph.
 *
 * Creates Pattern entity and optionally links to Learning entities.
 * Establishes APPLIES_TO relationship to CodeArea if specified.
 * Generates embedding for semantic search.
 *
 * @param pattern - The pattern to store
 * @param learningIds - Optional array of learning IDs this pattern is derived from
 * @throws Error if storage fails or referenced learnings don't exist
 */
export async function storePattern(
  pattern: Pattern,
  learningIds?: string[],
): Promise<void> {
  const db = getDatabase();

  // Generate embedding from pattern name and description
  const textToEmbed = [pattern.name, pattern.description]
    .filter(Boolean)
    .join(" ");
  const embedding = await generateEmbedding(textToEmbed);

  withTransaction(
    db,
    () => {
      // Ensure pattern has an ID
      const patternId = pattern.id || `pattern-${randomUUID()}`;

      // Create Pattern entity with embedding
      createOrMergeEntity(
        db,
        "Pattern",
        patternId,
        {
          ...pattern,
          id: patternId,
        },
        embedding,
      );

      // Link to CodeArea if specified
      if (pattern.codeArea) {
        const codeAreaId = `codearea-${pattern.codeArea.toLowerCase().replace(/\s+/g, "-")}`;
        createOrMergeEntity(db, "CodeArea", codeAreaId, {
          name: pattern.codeArea,
        });

        createRelationship(db, patternId, codeAreaId, "APPLIES_TO");
      }

      // Link to related learnings (LED_TO: pattern derived from learnings)
      if (learningIds && learningIds.length > 0) {
        for (const learningId of learningIds) {
          // Verify learning exists
          const exists = db
            .query<
              { id: string },
              [string]
            >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
            .get(learningId);

          if (!exists) {
            throw new Error(`Learning with ID "${learningId}" does not exist`);
          }

          createRelationship(db, patternId, learningId, "LED_TO");
        }
      }
    },
    "knowledge.storePattern",
  );
}

/**
 * Store a mistake in the knowledge graph.
 *
 * Creates Mistake entity and optionally links to Learning that resolved it.
 * Establishes IN_FILE relationship if filePath specified.
 * Establishes LED_TO relationship to the Learning (mistake led to learning).
 * Generates embedding for semantic search.
 *
 * @param mistake - The mistake to store
 * @param learningId - Optional ID of the learning that fixed this mistake
 * @throws Error if storage fails or referenced learning doesn't exist
 */
export async function storeMistake(
  mistake: Mistake,
  learningId?: string,
): Promise<void> {
  const db = getDatabase();

  // Generate embedding from mistake description and how it was fixed
  const textToEmbed = [mistake.description, mistake.howFixed]
    .filter(Boolean)
    .join(" ");
  const embedding = await generateEmbedding(textToEmbed);

  withTransaction(
    db,
    () => {
      // Ensure mistake has an ID
      const mistakeId = mistake.id || `mistake-${randomUUID()}`;

      // Create Mistake entity with embedding
      createOrMergeEntity(
        db,
        "Mistake",
        mistakeId,
        {
          ...mistake,
          id: mistakeId,
        },
        embedding,
      );

      // Link to File if specified
      if (mistake.filePath) {
        // Buffer is global in Bun
        const fileId = `file-${Buffer.from(mistake.filePath).toString("base64url")}`;
        createOrMergeEntity(db, "File", fileId, {
          path: mistake.filePath,
        });

        createRelationship(db, mistakeId, fileId, "IN_FILE");
      }

      // Link to learning (LED_TO: mistake led to learning that fixed it)
      if (learningId) {
        const exists = db
          .query<
            { id: string },
            [string]
          >("SELECT id FROM entities WHERE id = ? AND type = 'Learning'")
          .get(learningId);

        if (!exists) {
          throw new Error(`Learning with ID "${learningId}" does not exist`);
        }

        createRelationship(db, mistakeId, learningId, "LED_TO");
      }
    },
    "knowledge.storeMistake",
  );
}

/**
 * Store a topic in the knowledge graph.
 *
 * Creates Topic entity with embedding for semantic search.
 * Topics persist conversation themes across sessions.
 *
 * @param topic - The topic to store
 * @throws Error if storage fails
 */
export async function storeTopic(topic: Topic): Promise<void> {
  const db = getDatabase();

  // Generate embedding from topic content and keywords
  const textToEmbed = [topic.content, ...topic.keywords]
    .filter(Boolean)
    .join(" ");
  const embedding = await generateEmbedding(textToEmbed);

  // Warn if embedding generation failed - topic won't be searchable
  if (!embedding) {
    logger.warn(
      "Topic will be stored without embedding - semantic search will not find it",
      {
        topicId: topic.id,
        contentLength: textToEmbed.length,
        context: "knowledge.storeTopic",
      },
    );
  }

  withTransaction(
    db,
    () => {
      // Ensure topic has an ID
      const topicId = topic.id || `topic-${randomUUID()}`;

      // Create Topic entity with embedding
      createOrMergeEntity(
        db,
        "Topic",
        topicId,
        {
          ...topic,
          id: topicId,
        },
        embedding,
      );
    },
    "knowledge.storeTopic",
  );
}
