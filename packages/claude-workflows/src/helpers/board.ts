/**
 * GitHub Project Board helpers
 *
 * Provides functions for updating issue status on the GitHub Project board.
 */

import type { BoardConfig, BoardStatus, BoardUpdateResult } from "../types";
import { ghNoThrow } from "../utils/exec";

/**
 * Board configuration for the monorepo project
 */
export const BOARD_CONFIG: BoardConfig = {
  projectId: "PVT_kwDOB1lz3c4BI2yZ",
  statusFieldId: "PVTSSF_lADOB1lz3c4BI2yZzg5MUx4",
  statusOptions: {
    backlog: "8b7bb58f",
    next: "266160c2",
    inProgress: "3e320f16",
    blocked: "51c2af7b",
    done: "56048761",
  },
};

/**
 * Get the project item ID for an issue
 */
export async function getItemIdForIssue(
  issueNumber: number,
): Promise<string | null> {
  const query = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          projectItems(first: 10) {
            nodes {
              id
              project {
                id
              }
            }
          }
        }
      }
    }
  `;

  const result = await ghNoThrow([
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-F",
    "owner=rollercoaster-dev",
    "-F",
    "repo=monorepo",
    "-F",
    `issueNumber=${issueNumber}`,
  ]);

  if (result.status !== 0) {
    console.error(
      `Failed to get item ID for issue #${issueNumber}:`,
      result.stderr,
    );
    return null;
  }

  try {
    const data = JSON.parse(result.stdout);
    const items = data?.data?.repository?.issue?.projectItems?.nodes ?? [];
    const item = items.find(
      (n: { project: { id: string } }) =>
        n.project.id === BOARD_CONFIG.projectId,
    );
    return item?.id ?? null;
  } catch {
    console.error("Failed to parse GraphQL response");
    return null;
  }
}

/**
 * Update the status of an item on the board
 */
export async function updateBoardStatus(
  itemId: string,
  status: BoardStatus,
  context: string,
): Promise<BoardUpdateResult> {
  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  const optionId = BOARD_CONFIG.statusOptions[status];

  const result = await ghNoThrow([
    "api",
    "graphql",
    "-f",
    `query=${mutation}`,
    "-F",
    `projectId=${BOARD_CONFIG.projectId}`,
    "-F",
    `itemId=${itemId}`,
    "-F",
    `fieldId=${BOARD_CONFIG.statusFieldId}`,
    "-F",
    `optionId=${optionId}`,
  ]);

  if (result.status !== 0) {
    console.error(`[${context}] Failed to update board status:`, result.stderr);
    return { success: false, error: result.stderr };
  }

  console.log(`[${context}] Board status updated to: ${status}`);
  return { success: true, itemId };
}

/**
 * Move an issue to a status on the board
 *
 * Combines getItemIdForIssue and updateBoardStatus
 */
export async function moveIssueToStatus(
  issueNumber: number,
  status: BoardStatus,
  context: string,
): Promise<BoardUpdateResult> {
  const itemId = await getItemIdForIssue(issueNumber);

  if (!itemId) {
    return {
      success: false,
      error: `Could not find project item for issue #${issueNumber}`,
    };
  }

  return updateBoardStatus(itemId, status, context);
}
