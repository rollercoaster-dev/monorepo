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
import type { Shared } from "openbadges-types";

/** Helper to cast string to IRI branded type for tests */
const asIRI = (s: string): Shared.IRI => s as Shared.IRI;

/** Helper function to encode base58 (for testing) */
function encodeBase58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }

  let encoded = "";
  while (num > 0) {
    const remainder = Number(num % BigInt(58));
    encoded = ALPHABET[remainder] + encoded;
    num = num / BigInt(58);
  }

  return encoded || "1";
}

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
      asIRI("https://example.com/keys/1"),
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
      asIRI("https://example.com/keys/1"),
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
      asIRI("https://example.com/keys/1"),
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

    const result = await verifyJWTProof(
      malformedJWT,
      asIRI("https://example.com/keys/1"),
    );

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

    const result = await verifyJWTProof(
      oldJWT,
      asIRI("https://example.com/keys/1"),
      {
        verificationMethodResolver: mockResolver,
        maxProofAge: 60, // Max 60 seconds
      },
    );

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

    const result = await verifyJWTProof(
      vcJWT,
      asIRI("https://example.com/keys/1"),
      {
        verificationMethodResolver: mockResolver,
      },
    );

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

    const result = await verifyJWTProof(
      invalidJWT,
      asIRI("https://example.com/keys/1"),
      {
        verificationMethodResolver: mockResolver,
      },
    );

    expect(result.passed).toBe(false);
    expect(result.check).toBe("proof.jwt.type");
    expect(result.error).toContain("Unexpected JWT typ header");
  });
});

describe("Verification Method Resolution", () => {
  it("should use custom resolver when provided", async () => {
    const mockKey = await jose.generateKeyPair("RS256");
    const expectedIRI = asIRI("https://example.com/keys/1");
    const mockResolver: VerificationMethodResolver = async (vm) => {
      if (vm === expectedIRI) {
        return mockKey.publicKey;
      }
      return null;
    };

    const result = await resolveVerificationMethod(expectedIRI, mockResolver);

    expect(result).toBe(mockKey.publicKey);
  });

  it("should return null for custom resolver that throws", async () => {
    const mockResolver: VerificationMethodResolver = async () => {
      throw new Error("Resolver error");
    };

    const result = await resolveVerificationMethod(
      asIRI("https://example.com/keys/1"),
      mockResolver,
    );

    expect(result).toBeNull();
  });

  it("should return null for unsupported verification method format", async () => {
    const result = await resolveVerificationMethod(
      asIRI("unsupported:method:format"),
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for did:key (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      asIRI("did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"),
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for did:web (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      asIRI("did:web:example.com"),
      undefined,
    );

    expect(result).toBeNull();
  });

  it("should return null for JWKS URL (not yet implemented)", async () => {
    const result = await resolveVerificationMethod(
      asIRI("https://example.com/.well-known/jwks.json"),
      undefined,
    );

    expect(result).toBeNull();
  });
});

describe("Linked Data Proof Verification", () => {
  let testEd25519KeyPair: jose.GenerateKeyPairResult;

  beforeAll(async () => {
    // Generate test Ed25519 key pair
    testEd25519KeyPair = await jose.generateKeyPair("EdDSA", {
      extractable: true,
    });
  });

  describe("Proof Structure Validation", () => {
    it("should fail for proof missing required type field", async () => {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      const proof = {
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const result = await verifyLinkedDataProof(credential, proof);

      expect(result.passed).toBe(false);
      expect(result.check).toBe("proof.linked-data.structure");
      expect(result.error).toContain("missing required field: type");
    });

    it("should fail for proof with invalid proofPurpose", async () => {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      const proof = {
        type: "Ed25519Signature2020",
        proofPurpose: "invalidPurpose",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const result = await verifyLinkedDataProof(credential, proof);

      expect(result.passed).toBe(false);
      expect(result.check).toBe("proof.linked-data.purpose");
      expect(result.error).toContain("Invalid proof purpose");
    });

    it("should accept assertionMethod proofPurpose", async () => {
      const mockResolver: VerificationMethodResolver = async () => null;

      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      const proof = {
        type: "Ed25519Signature2020",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      // Will fail on verification method resolution, not proof purpose
      expect(result.check).not.toBe("proof.linked-data.purpose");
    });
  });

  describe("Verification Method Resolution", () => {
    it("should fail when verification method cannot be resolved", async () => {
      const mockResolver: VerificationMethodResolver = async () => null;

      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      const proof = {
        type: "Ed25519Signature2020",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(false);
      expect(result.check).toBe("proof.linked-data.verification-method");
      expect(result.error).toContain("Failed to resolve verification method");
    });
  });

  describe("Ed25519Signature2020", () => {
    it("should verify valid Ed25519 signature", async () => {
      // Create test credential
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "did:example:issuer",
        credentialSubject: {
          id: "did:example:subject",
        },
      };

      // Canonicalize using sorted keys (same as implementation)
      const sortKeys = (obj: unknown): unknown => {
        if (Array.isArray(obj)) {
          return obj.map(sortKeys);
        }
        if (obj !== null && typeof obj === "object") {
          return Object.keys(obj)
            .sort()
            .reduce(
              (result, key) => {
                result[key] = sortKeys((obj as Record<string, unknown>)[key]);
                return result;
              },
              {} as Record<string, unknown>,
            );
        }
        return obj;
      };

      const canonicalDoc = JSON.stringify(sortKeys(credential));
      const documentBytes = new TextEncoder().encode(canonicalDoc);
      const signatureBytes = await globalThis.crypto.subtle.sign(
        "Ed25519",
        testEd25519KeyPair.privateKey,
        documentBytes,
      );

      // Encode signature as multibase (z = base58btc)
      const base58 = encodeBase58(new Uint8Array(signatureBytes));
      const proofValue = `z${base58}`;

      const proof = {
        type: "Ed25519Signature2020",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue,
      };

      const mockResolver: VerificationMethodResolver = async () =>
        testEd25519KeyPair.publicKey;

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(true);
      expect(result.details?.proofType).toBe("Ed25519Signature2020");
    });

    it("should fail with invalid Ed25519 signature", async () => {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      const proof = {
        type: "Ed25519Signature2020",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z58DAdFfa9SkqZMVPxAQpic7ndSayn1PzZs6ZjWp1CktyGe",
      };

      const mockResolver: VerificationMethodResolver = async () =>
        testEd25519KeyPair.publicKey;

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(false);
      expect(result.check).toBe("proof.linked-data.signature");
    });
  });

  describe("DataIntegrityProof", () => {
    it("should verify eddsa-rdfc-2022 cryptosuite", async () => {
      // Create test credential
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        issuer: "did:example:issuer",
      };

      // Canonicalize using sorted keys (same as implementation)
      const sortKeys = (obj: unknown): unknown => {
        if (Array.isArray(obj)) {
          return obj.map(sortKeys);
        }
        if (obj !== null && typeof obj === "object") {
          return Object.keys(obj)
            .sort()
            .reduce(
              (result, key) => {
                result[key] = sortKeys((obj as Record<string, unknown>)[key]);
                return result;
              },
              {} as Record<string, unknown>,
            );
        }
        return obj;
      };

      const canonicalDoc = JSON.stringify(sortKeys(credential));
      const documentBytes = new TextEncoder().encode(canonicalDoc);
      const signatureBytes = await globalThis.crypto.subtle.sign(
        "Ed25519",
        testEd25519KeyPair.privateKey,
        documentBytes,
      );

      const base58 = encodeBase58(new Uint8Array(signatureBytes));
      const proofValue = `z${base58}`;

      const proof = {
        type: "DataIntegrityProof",
        cryptosuite: "eddsa-rdfc-2022",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue,
      };

      const mockResolver: VerificationMethodResolver = async () =>
        testEd25519KeyPair.publicKey;

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(true);
      expect(result.details?.cryptosuite).toBe("eddsa-rdfc-2022");
    });

    it("should fail for unsupported cryptosuite", async () => {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
      };

      const proof = {
        type: "DataIntegrityProof",
        cryptosuite: "unsupported-cryptosuite",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const mockResolver: VerificationMethodResolver = async () =>
        testEd25519KeyPair.publicKey;

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(false);
      expect(result.error).toContain("Unsupported cryptosuite");
    });
  });

  describe("Unsupported Proof Types", () => {
    it("should fail for unsupported proof type", async () => {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
      };

      const proof = {
        type: "UnsupportedProofType2024",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:issuer#key-1",
        proofValue: "z123",
      };

      const mockResolver: VerificationMethodResolver = async () =>
        testEd25519KeyPair.publicKey;

      const result = await verifyLinkedDataProof(credential, proof, {
        verificationMethodResolver: mockResolver,
      });

      expect(result.passed).toBe(false);
      expect(result.error).toContain("Unsupported proof type");
    });
  });
});
