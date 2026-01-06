/**
 * Tests for Multiple Proofs Support
 *
 * Tests the verification service's ability to handle credentials with
 * multiple proofs as allowed by OB 3.0 and W3C VC Data Model 2.0.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import * as jose from "jose";
import { verify } from "../../../src/services/verification/verification.service.js";
import type { Shared } from "openbadges-types";

/** Helper to cast string to IRI branded type for tests */
const asIRI = (s: string): Shared.IRI => s as Shared.IRI;

describe("Multiple Proofs Support", () => {
  let testKeyPair: jose.GenerateKeyPairResult;

  beforeAll(async () => {
    testKeyPair = await jose.generateKeyPair("RS256", {
      extractable: true,
    });
  });

  describe("Single Proof Handling", () => {
    it("should handle credential with single proof object", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: {
          type: "Ed25519Signature2020",
          proofPurpose: "assertionMethod",
          verificationMethod: "did:example:issuer#key-1",
          proofValue: "z58DAdFfa9SkqZMVPxAQpic7ndSayn1PzZs6ZjWp1CktyGe",
        },
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
      });

      // Should have proof results for single proof
      expect(result.proofResults).toBeDefined();
      expect(result.proofResults).toHaveLength(1);
      expect(result.totalProofs).toBe(1);
      expect(result.proofResults![0].index).toBe(0);
      expect(result.proofResults![0].proofType).toBe("Ed25519Signature2020");
    });

    it("should handle credential with no proof field", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
      });

      expect(result.isValid).toBe(false);
      expect(
        result.checks.proof.some(
          (c) => c.check === "proof.linked-data.missing",
        ),
      ).toBe(true);
    });
  });

  describe("Multiple Proofs Handling", () => {
    it("should handle credential with multiple proofs (array)", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58DAdFfa9SkqZMVPxAQpic7ndSayn1PzZs6ZjWp1CktyGe",
          },
          {
            type: "DataIntegrityProof",
            cryptosuite: "eddsa-rdfc-2022",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-2",
            proofValue: "z12345",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
      });

      // Should have proof results for all proofs
      expect(result.proofResults).toBeDefined();
      expect(result.proofResults).toHaveLength(2);
      expect(result.totalProofs).toBe(2);

      // First proof
      expect(result.proofResults![0].index).toBe(0);
      expect(result.proofResults![0].proofType).toBe("Ed25519Signature2020");

      // Second proof
      expect(result.proofResults![1].index).toBe(1);
      expect(result.proofResults![1].proofType).toBe("DataIntegrityProof");
    });

    it("should extract verification methods from each proof", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58D",
          },
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-2",
            proofValue: "z59E",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
      });

      expect(result.proofResults![0].verificationMethod).toBe(
        asIRI("did:example:issuer#key-1"),
      );
      expect(result.proofResults![1].verificationMethod).toBe(
        asIRI("did:example:issuer#key-2"),
      );
    });
  });

  describe("Proof Policy", () => {
    it("should apply 'all' policy by default (all proofs must pass)", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58D",
          },
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-2",
            proofValue: "z59E",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
        // proofPolicy defaults to 'all'
      });

      // Should have a policy check for multi-proof
      const policyCheck = result.checks.proof.find(
        (c) => c.check === "proof.policy",
      );
      expect(policyCheck).toBeDefined();
      expect(policyCheck?.details?.policy).toBe("all");
    });

    it("should apply 'any' policy when specified", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58D",
          },
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-2",
            proofValue: "z59E",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
        proofPolicy: "any",
      });

      const policyCheck = result.checks.proof.find(
        (c) => c.check === "proof.policy",
      );
      expect(policyCheck).toBeDefined();
      expect(policyCheck?.details?.policy).toBe("any");
      expect(policyCheck?.details?.requiredToPass).toBe(1);
    });

    it("should report correct passed/total counts", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58D",
          },
          {
            type: "DataIntegrityProof",
            cryptosuite: "eddsa-rdfc-2022",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-2",
            proofValue: "z12345",
          },
          {
            type: "JsonWebSignature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-3",
            jws: "eyJhbGciOiJFZERTQSJ9.test.signature",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
      });

      expect(result.totalProofs).toBe(3);
      // All proofs fail as Linked Data verification is not implemented yet
      expect(result.passedProofs).toBe(0);
    });
  });

  describe("JWT Credentials", () => {
    it("should handle JWT credentials as single proof", async () => {
      const jwt = await new jose.SignJWT({
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: "https://example.com/issuer",
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: "did:example:123",
          },
        },
      })
        .setProtectedHeader({
          alg: "RS256",
          typ: "vc+jwt",
          kid: "test-key-1",
        })
        .setIssuedAt()
        .setIssuer("https://example.com/issuer")
        .sign(testKeyPair.privateKey);

      const mockResolver = async () => testKeyPair.publicKey;

      const result = await verify(jwt, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
        verificationMethodResolver: mockResolver,
      });

      // JWT has single proof
      expect(result.totalProofs).toBe(1);
      expect(result.proofResults).toBeDefined();
      expect(result.proofResults).toHaveLength(1);
      expect(result.proofResults![0].proofType).toBe("jwt");
      expect(result.proofResults![0].passed).toBe(true);
    });
  });

  describe("Skip Proof Verification", () => {
    it("should not include proof results when skipProofVerification is true", async () => {
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:example:subject",
        },
        proof: [
          {
            type: "Ed25519Signature2020",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:example:issuer#key-1",
            proofValue: "z58D",
          },
        ],
      };

      const result = await verify(credential, {
        skipIssuerVerification: true,
        skipTemporalValidation: true,
        skipProofVerification: true,
      });

      // No proof results when verification is skipped
      expect(result.proofResults).toBeUndefined();
      expect(result.totalProofs).toBeUndefined();
      expect(result.passedProofs).toBeUndefined();
    });
  });
});
