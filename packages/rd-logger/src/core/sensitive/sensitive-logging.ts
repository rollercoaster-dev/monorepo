/**
 * Interface for approval information when logging sensitive data
 */
export interface SensitiveLoggingApproval {
  /**
   * Reason for logging sensitive data
   */
  reason: string;
  
  /**
   * Person or entity that approved the logging of sensitive data
   */
  approvedBy: string;
  
  /**
   * Optional expiration date for the approval
   */
  expiresAt?: Date;
}
