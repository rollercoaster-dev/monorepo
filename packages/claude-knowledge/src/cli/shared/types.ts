/**
 * Session metadata structure stored in the temp file.
 */
export interface SessionMetadataFile {
  sessionId: string;
  learningsInjected: number;
  startTime: string;
  issueNumber?: number;
}
