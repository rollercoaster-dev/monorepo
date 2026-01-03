/**
 * Tests for Proof Verification Service
 *
 * Tests JWT and Linked Data proof verification functions
 */

import { describe, it, expect, beforeAll } from "bun:test";
import * as jose from "jose";
import {
  verifyJWTProof,
  resolveVerificationMethod,
  verifyLinkedDataProof,
} from "../../../src/services/verification/proof-verifier.js";
import type { VerificationMethodResolver } from "../../../src/services/verification/types.js";

describe("JWT Proof Verification", () => {
  let testKeyPair: jose.GenerateKeyPairResult;
  let testJWT: string;

  beforeAll(async () => {
    // Generate test RSA key pair
    testKeyPair = await jose.generateKeyPair("RS256", {
      extractable: true,
    });

    // Create a test JWT credential
    testJWT = await new jose.SignJWT({
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "https://example.com/issuer",
        credentialSubject: {
          id: "did:example:123",
          achievement: {
            name: "Test Badge",
          },
        },
      },
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: "test-key-1",
        typ: "JWT",
      })
      .setIssuedAt()
      .setIssuer("https://example.com/issuer")
      .setSubject("did:example:123")
      .sign(testKeyPair.privateKey);
  });

  it("should successfully verify a valid JWT proof", async () => {
    // Mock resolver that returns our test public key
    const mockResolver: VerificationMethodResolver = async () => {
      return testKeyPair.publicKey;
    };

    const result = await verifyJWTProof(
      testJWT,
      "https://example.com/keys/1",
      {
        verificationMethodResolver: mockResolver,
      },
    );

    expect(result.passed).toBe(true);
    expect(result.check).toBe("proof.jwt.signature");
    expect(result.error).toBeUndefined();
  });

  it("should fail verification with wrong public key", async () => {
    // Generate a different key pair
    const wrongKeyPair = await jose.generateKeyPair("RS256");

    const mockResolver: VerificationMethodResolver = async () => {
      return wrongKeyPair.publicKey;
    };

    const result = await verifyJWTProof(
      testJWT,
      "https://example.com/keys/1",
      {
        verificationMethodResolver: mockResolver,
      },
    );

    expect(result.passed).toBe(false);
    expect(result.error).toContain("JWT verification failed");
  });

  it("should fail verification when verification method cannot be resolved", async () => {
    const mockResolver: VerificationMethodResolver = async () => {
      return null;
    };

    const result = await verifyJWTProof(
      testJWT,
      "https://example.com/keys/1",
      {
        verificationMethodResolver: mockResolver,
      },
    );

    expect(result.passed).toBe(false);
    expect(result.check).toBe("proof.jwt.verification-method");
    expect(result.error).toContain("Failed to resolve verification method");
  });

  it("should fail verification for JWT without algorithm header", async () => {
    // Create a malformed JWT (this is hard to do with jose, so we'll test with a mock)
    const malformedJWT = "eyJhbGciOiJub25lIn0.eyJ2YyI6e319.";

    const result = await verifyJWTProof(malformedJWT, "https://example.com/keys/1");

    expect(result.passed).toBe(false);
  });

  it("should fail verification when proof age exceeds maxProofAge", async () => {
    // Create JWT with old issuance time
    const oldJWT = await new jose.SignJWT({
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
      },
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
      .sign(testKeyPair.privateKey);

    const mockResolver: VerificationMethodResolver = async () => {
      return testKeyPair.publicKey;
    };

    const result = await verifyJWTProof(oldJWT, "https://example.com/keys/1", {
      verificationMethodResolver: mockResolver,
      maxProofAge: 60, // Max 60 seconds
    });

    expect(result.passed).toBe(false);
    expect(result.check).toBe("proof.jwt.age");
    expect(result.error).toContain("exceeds maximum");
  });

  it("should accept valid vc+jwt type header", async () => {
    const vcJWT = await new jose.SignJWT({
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
      },
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "vc+jwt",
      })
      .setIssuedAt()
      .sign(testKeyPair.privateKey);

    const mockResolver: VerificationMethodResolver = async () => {
      return testKeyPair.publicKey;
    };

    const result = await verifyJWTProof(vcJWT, "https://example.com/keys/1", {
      verificationMethodResolver: mockResolver,
    });

    expect(result.passed).toBe(true);
  });

  it("should reject invalid type header", async () => {
    const invalidJWT = await new jose.SignJWT({
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
      },
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "invalid+type",
      })
      .setIssuedAt()
      .sign(testKeyPair.privateKey);

    const mockResolver: VerificationMethodResolver = async () => {
      return testKeyPair.publicKey;
    };

    const result = await verifyJWTProof(invalidJWT, "https://example.com/keys/1", {
      verificationMethodResolver: mockResolver,
    });

    expect(result.passed).toBe(false);
    expect(result.check).toBe("proof.jwt.type");
    expect(result.error).toContain("Unexpected JWT typ header");
  });
});

describe("Verification Method Resolution", () => {
  it("should use custom resolver when provided", async () => {
    const mockKey = await jose.generateKeyPair("RS256");
    const mockResolver: VerificationMethodResolver = async (vm) => {
      if (vm === "https://example.com/keys/1") {
        return mockKey.publicKey;
      }
      return null;
    };

    const result = await resolveVerificationMethod(
      "https://example.com/keys/1",
      mockResolver,
    );

    expect(result).toBe(mockKey.publicKey);
  });

  it("should return null for custom resolver that throws", async () => {
    const mockResolver: VerificationMethodResolver = async () => {
      throw new Error("Resolver error");
    };

    const result = await resolveVerificationMethod(
      "https://example.com/keys/1",
      mockResolver,
    );

    expect(result).toBeNull();
  });

  it("should return null for unsupported verification method format", async () => {
    const result = await resolveVerificationMethod(
      "unsupported:method:format",
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for did:key (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for did:web (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      "did:web:example.com",
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for JWKS URL (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      "https://example.com/.well-known/jwks.json",
      undefined,
    );

    expect(result).toBeNull();
  });
});

describe("Linked Data Proof Verification", () => {
  it("should return not implemented error", async () => {
    const credential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: "did:example:issuer",
      credentialSubject: {
        id: "did:example:subject",
      },
    };

    const proof = {
      type: "DataIntegrityProof",
      cryptosuite: "eddsa-rdfc-2022",
      proofPurpose: "assertionMethod",
      verificationMethod: "did:example:issuer#key-1",
      created: "2024-01-01T00:00:00Z",
      proofValue: "z58DAdFfa9SkqZMVPxAQpic7ndSayn1PzZs6ZjWp1CktyGesjuTSwRdoWhAfGFCF5bppETSTojQCrfFPP2oumHKtz",
    };

    const result = await verifyLinkedDataProof(credential, proof);

    expect(result.passed).toBe(false);
    expect(result.error).toContain("not yet implemented");
    expect(result.details?.proofType).toBe("DataIntegrityProof");
  });
});
