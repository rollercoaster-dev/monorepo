// tests/mock-augmentation.d.ts
import type { OB2, OB3 } from "@/types";
import type { VerificationResult } from "@/services/BadgeVerificationService";

// Augment the module to add the missing mock functions
declare module "@/services/BadgeVerificationService" {
  export namespace BadgeVerificationService {
    export interface StaticBadgeVerificationService {
      verifyBadge: {
        (
          badge: OB2.Assertion | OB3.VerifiableCredential,
        ): Promise<VerificationResult>;
        mockResolvedValue: (val: VerificationResult) => void;
        mockResolvedValueOnce: (val: VerificationResult) => void;
        mockRejectedValue: (error: Error) => void;
        mockRejectedValueOnce: (error: Error) => void;
      };
    }
  }
}
