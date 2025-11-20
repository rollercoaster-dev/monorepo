// tests/integration/setupMocks.ts
import { vi } from 'vitest';
import type { OB2, OB3 } from '@/types';
import type { VerificationResult } from '@/services/BadgeVerificationService';

// Create a mock handler with type-safe methods
interface TypedMock<TArgs extends unknown[], TReturn> {
  (...args: TArgs): TReturn;
  mockResolvedValue: (value: Awaited<TReturn>) => TypedMock<TArgs, TReturn>;
  mockResolvedValueOnce: (value: Awaited<TReturn>) => TypedMock<TArgs, TReturn>;
  mockRejectedValue: (reason?: unknown) => TypedMock<TArgs, TReturn>;
  mockRejectedValueOnce: (reason?: unknown) => TypedMock<TArgs, TReturn>;
}

// Create a type-safe mock function factory
export function createTypedMock<TArgs extends unknown[], TReturn>(): TypedMock<TArgs, TReturn> {
  const mock = vi.fn() as unknown as TypedMock<TArgs, TReturn>;
  return mock;
}

// Create mock BadgeVerificationService
export const createMockBadgeVerificationService = (): {
  verifyBadge: TypedMock<[OB2.Assertion | OB3.VerifiableCredential], Promise<VerificationResult>>;
} => {
  return {
    verifyBadge: createTypedMock<
      [OB2.Assertion | OB3.VerifiableCredential],
      Promise<VerificationResult>
    >(),
  };
};
