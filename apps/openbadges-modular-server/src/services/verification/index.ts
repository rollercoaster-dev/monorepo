/**
 * Verification Service Module
 *
 * Exports all verification functionality for Open Badges 3.0 credentials.
 */

// Main verification service
export { verify } from "./verification.service.js";

// Individual verifiers
export { verifyJWTProof, verifyLinkedDataProof } from "./proof-verifier.js";
export {
  verifyIssuer,
  resolveIssuerDID,
  fetchIssuerJWKS,
} from "./issuer-verifier.js";

// Types
export type {
  VerificationStatus,
  ProofType,
  VerificationCheck,
  VerificationChecks,
  VerificationOptions,
  VerificationMethodResolver,
  VerificationKeyMaterial,
  VerificationResult,
  VerificationMetadata,
  BatchVerificationInput,
  BatchVerificationResult,
} from "./types.js";
