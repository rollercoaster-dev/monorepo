/**
 * Unit tests for Key Generation Service
 *
 * Tests RSA and EdDSA key pair generation, JWK conversion,
 * and utility functions.
 */

import { describe, it, expect } from "bun:test";
import {
  generateRSAKeyPair,
  generateEdDSAKeyPair,
  generateKeyPairFromOptions,
  extractPublicJWK,
  keyPairWithJWKToKeyPair,
  keyPairToJWK,
} from "../../../src/services/key-management/key-generator";
import {
  isRSAKey,
  isOKPKey,
  isPrivateKey,
  type RSAPublicKey,
  type OKPPublicKey,
} from "../../../src/services/key-management/types";

describe("Key Generator Service", () => {
  describe("generateRSAKeyPair", () => {
    it("should generate a valid RSA key pair with default options", async () => {
      const keyPair = await generateRSAKeyPair();

      // Check basic properties
      expect(keyPair.id).toBeDefined();
      expect(keyPair.keyType).toBe("RSA");
      expect(keyPair.algorithm).toBe("RS256");
      expect(keyPair.status).toBe("active");
      expect(keyPair.createdAt).toBeDefined();

      // Check PEM format
      expect(keyPair.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
      expect(keyPair.privateKey).toContain("-----BEGIN PRIVATE KEY-----");

      // Check JWK format
      const rsaPublicJwk = keyPair.publicJwk as RSAPublicKey;
      expect(rsaPublicJwk.kty).toBe("RSA");
      expect(rsaPublicJwk.n).toBeDefined();
      expect(rsaPublicJwk.e).toBeDefined();
      expect(keyPair.publicJwk.kid).toBe(keyPair.id);
      expect(keyPair.publicJwk.alg).toBe("RS256");
      expect(keyPair.publicJwk.use).toBe("sig");

      // Check private JWK has additional components
      expect(keyPair.privateJwk.d).toBeDefined();
    });

    it("should generate RSA key pair with custom algorithm", async () => {
      const keyPair = await generateRSAKeyPair({ algorithm: "RS384" });

      expect(keyPair.algorithm).toBe("RS384");
      expect(keyPair.publicJwk.alg).toBe("RS384");
    });

    it("should generate RSA key pair with custom key ID", async () => {
      const customKeyId = "my-custom-key-id";
      const keyPair = await generateRSAKeyPair({ keyId: customKeyId });

      expect(keyPair.id).toBe(customKeyId);
      expect(keyPair.publicJwk.kid).toBe(customKeyId);
    });

    it("should set expiration when expiresInDays is provided", async () => {
      const keyPair = await generateRSAKeyPair({ expiresInDays: 30 });

      expect(keyPair.expiresAt).toBeDefined();
      const expiresAt = new Date(keyPair.expiresAt!);
      const createdAt = new Date(keyPair.createdAt);
      const diffDays =
        (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(30);
    });

    it("should throw error for unsupported RSA algorithm", async () => {
      await expect(generateRSAKeyPair({ algorithm: "EdDSA" })).rejects.toThrow(
        "Unsupported RSA algorithm",
      );
    });

    it("should throw error for modulus length below 2048 bits", async () => {
      await expect(generateRSAKeyPair({ modulusLength: 1024 })).rejects.toThrow(
        "RSA modulus length must be at least 2048 bits",
      );
    });

    it("should accept custom modulus length >= 2048", async () => {
      const keyPair = await generateRSAKeyPair({ modulusLength: 3072 });
      expect(keyPair.keyType).toBe("RSA");
      // 3072-bit keys have longer n values
      const rsaPublicJwk = keyPair.publicJwk as RSAPublicKey;
      expect(rsaPublicJwk.n.length).toBeGreaterThan(300);
    });
  });

  describe("generateEdDSAKeyPair", () => {
    it("should generate a valid EdDSA (Ed25519) key pair", async () => {
      const keyPair = await generateEdDSAKeyPair();

      // Check basic properties
      expect(keyPair.id).toBeDefined();
      expect(keyPair.keyType).toBe("OKP");
      expect(keyPair.algorithm).toBe("EdDSA");
      expect(keyPair.status).toBe("active");
      expect(keyPair.createdAt).toBeDefined();

      // Check PEM format
      expect(keyPair.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
      expect(keyPair.privateKey).toContain("-----BEGIN PRIVATE KEY-----");

      // Check JWK format
      const okpPublicJwk = keyPair.publicJwk as OKPPublicKey;
      expect(okpPublicJwk.kty).toBe("OKP");
      expect(okpPublicJwk.crv).toBe("Ed25519");
      expect(okpPublicJwk.x).toBeDefined();
      expect(keyPair.publicJwk.kid).toBe(keyPair.id);
      expect(keyPair.publicJwk.alg).toBe("EdDSA");
      expect(keyPair.publicJwk.use).toBe("sig");

      // Check private JWK has d parameter
      expect(keyPair.privateJwk.d).toBeDefined();
    });

    it("should generate EdDSA key pair with custom key ID", async () => {
      const customKeyId = "ed25519-key-123";
      const keyPair = await generateEdDSAKeyPair({ keyId: customKeyId });

      expect(keyPair.id).toBe(customKeyId);
      expect(keyPair.publicJwk.kid).toBe(customKeyId);
    });

    it("should set expiration when expiresInDays is provided", async () => {
      const keyPair = await generateEdDSAKeyPair({ expiresInDays: 90 });

      expect(keyPair.expiresAt).toBeDefined();
      const expiresAt = new Date(keyPair.expiresAt!);
      const createdAt = new Date(keyPair.createdAt);
      const diffDays =
        (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(90);
    });
  });

  describe("generateKeyPairFromOptions", () => {
    it("should generate RSA key pair when keyType is RSA", async () => {
      const keyPair = await generateKeyPairFromOptions({
        keyType: "RSA",
        algorithm: "RS256",
      });

      expect(keyPair.keyType).toBe("RSA");
      expect(keyPair.algorithm).toBe("RS256");
    });

    it("should generate OKP key pair when keyType is OKP", async () => {
      const keyPair = await generateKeyPairFromOptions({
        keyType: "OKP",
        algorithm: "EdDSA",
      });

      expect(keyPair.keyType).toBe("OKP");
      expect(keyPair.algorithm).toBe("EdDSA");
    });

    it("should throw error for invalid RSA algorithm", async () => {
      await expect(
        generateKeyPairFromOptions({
          keyType: "RSA",
          algorithm: "EdDSA",
        }),
      ).rejects.toThrow("Invalid algorithm EdDSA for RSA key type");
    });

    it("should throw error for invalid OKP algorithm", async () => {
      await expect(
        generateKeyPairFromOptions({
          keyType: "OKP",
          algorithm: "RS256",
        }),
      ).rejects.toThrow("Invalid algorithm RS256 for OKP key type");
    });

    it("should throw error for unsupported key type", async () => {
      await expect(
        generateKeyPairFromOptions({
          keyType: "EC" as "RSA",
          algorithm: "ES256" as "RS256",
        }),
      ).rejects.toThrow("Unsupported key type");
    });
  });

  describe("Utility Functions", () => {
    describe("extractPublicJWK", () => {
      it("should extract public JWK from key pair", async () => {
        const keyPair = await generateRSAKeyPair();
        const publicJwk = extractPublicJWK(keyPair);

        expect(publicJwk).toEqual(keyPair.publicJwk);
        expect(publicJwk.kty).toBe("RSA");
        // Ensure no private key material
        expect("d" in publicJwk).toBe(false);
      });
    });

    describe("keyPairWithJWKToKeyPair", () => {
      it("should convert KeyPairWithJWK to KeyPair without JWK fields", async () => {
        const keyPairWithJwk = await generateRSAKeyPair();
        const keyPair = keyPairWithJWKToKeyPair(keyPairWithJwk);

        expect(keyPair.id).toBe(keyPairWithJwk.id);
        expect(keyPair.publicKey).toBe(keyPairWithJwk.publicKey);
        expect(keyPair.privateKey).toBe(keyPairWithJwk.privateKey);
        expect(keyPair.keyType).toBe(keyPairWithJwk.keyType);
        expect(keyPair.algorithm).toBe(keyPairWithJwk.algorithm);

        // Ensure JWK fields are removed
        expect("publicJwk" in keyPair).toBe(false);
        expect("privateJwk" in keyPair).toBe(false);
      });
    });

    describe("keyPairToJWK", () => {
      it("should convert RSA PEM keys to JWK format", async () => {
        const keyPair = await generateRSAKeyPair();
        const { publicJwk, privateJwk } = keyPairToJWK(
          keyPair.publicKey,
          keyPair.privateKey,
          "RSA",
          "RS256",
          "test-key-id",
        );

        expect(publicJwk.kty).toBe("RSA");
        expect(publicJwk.kid).toBe("test-key-id");
        expect(privateJwk.kty).toBe("RSA");
        expect(privateJwk.d).toBeDefined();
      });

      it("should convert OKP PEM keys to JWK format", async () => {
        const keyPair = await generateEdDSAKeyPair();
        const { publicJwk, privateJwk } = keyPairToJWK(
          keyPair.publicKey,
          keyPair.privateKey,
          "OKP",
          "EdDSA",
          "ed-key-id",
        );

        expect(publicJwk.kty).toBe("OKP");
        expect(publicJwk.kid).toBe("ed-key-id");
        expect(privateJwk.kty).toBe("OKP");
        expect(privateJwk.d).toBeDefined();
      });

      it("should throw error for invalid RSA algorithm", async () => {
        const keyPair = await generateRSAKeyPair();
        expect(() =>
          keyPairToJWK(
            keyPair.publicKey,
            keyPair.privateKey,
            "RSA",
            "EdDSA",
            "key-id",
          ),
        ).toThrow("Invalid algorithm EdDSA for RSA key type");
      });

      it("should throw error for invalid OKP algorithm", async () => {
        const keyPair = await generateEdDSAKeyPair();
        expect(() =>
          keyPairToJWK(
            keyPair.publicKey,
            keyPair.privateKey,
            "OKP",
            "RS256",
            "key-id",
          ),
        ).toThrow("Invalid algorithm RS256 for OKP key type. Use EdDSA.");
      });

      it("should throw error for unsupported key type", () => {
        expect(() =>
          keyPairToJWK(
            "pem",
            "pem",
            "EC" as "RSA",
            "ES256" as "RS256",
            "key-id",
          ),
        ).toThrow("Unsupported key type for JWK conversion");
      });
    });
  });

  describe("Type Guards", () => {
    it("should identify RSA keys with isRSAKey", async () => {
      const rsaKeyPair = await generateRSAKeyPair();
      const eddsaKeyPair = await generateEdDSAKeyPair();

      expect(isRSAKey(rsaKeyPair.publicJwk)).toBe(true);
      expect(isRSAKey(eddsaKeyPair.publicJwk)).toBe(false);
    });

    it("should identify OKP keys with isOKPKey", async () => {
      const rsaKeyPair = await generateRSAKeyPair();
      const eddsaKeyPair = await generateEdDSAKeyPair();

      expect(isOKPKey(rsaKeyPair.publicJwk)).toBe(false);
      expect(isOKPKey(eddsaKeyPair.publicJwk)).toBe(true);
    });

    it("should identify private keys with isPrivateKey", async () => {
      const keyPair = await generateRSAKeyPair();

      expect(isPrivateKey(keyPair.publicJwk)).toBe(false);
      expect(isPrivateKey(keyPair.privateJwk)).toBe(true);
    });
  });
});
