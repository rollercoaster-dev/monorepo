// tests/integration/components/__mocks__/BadgeVerificationService.ts
import { vi } from 'vitest';
import type { VerificationResult } from '../../../../src/services/BadgeVerificationService';

const defaultResult: VerificationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  verificationMethod: 'hosted' as const,
  expirationStatus: 'valid',
  revocationStatus: 'valid',
  structureValidation: {
    isValid: true,
    errors: [],
    warnings: [],
  },
  contentValidation: {
    isValid: true,
    errors: [],
    warnings: [],
  },
};

export const BadgeVerificationService = {
  verifyBadge: vi.fn().mockResolvedValue(defaultResult),
};

// Helper function to set up default successful verification result
export function setupSuccessfulVerification(): void {
  BadgeVerificationService.verifyBadge.mockResolvedValue({ ...defaultResult });
}

// Helper function to set up a failed verification result
export function setupFailedVerification(errors: string[] = ['Invalid badge format']): void {
  const failedResult: VerificationResult = {
    ...defaultResult,
    isValid: false,
    errors,
    structureValidation: {
      isValid: false,
      errors,
      warnings: [],
    },
  };
  BadgeVerificationService.verifyBadge.mockResolvedValue(failedResult);
}

// Helper function to set up verification result with warnings
export function setupVerificationWithWarnings(warnings: string[] = ['Test warning']): void {
  const warningResult: VerificationResult = {
    ...defaultResult,
    warnings,
    contentValidation: {
      isValid: true,
      errors: [],
      warnings,
    },
  };
  BadgeVerificationService.verifyBadge.mockResolvedValue(warningResult);
}

// Helper function to set up a custom verification result
export function setupCustomVerification(result: Partial<VerificationResult>): void {
  BadgeVerificationService.verifyBadge.mockResolvedValue({
    ...defaultResult,
    ...result,
  });
}
