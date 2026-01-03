/**
 * Issuer Verification Service Tests
 *
 * Tests for DID resolution, JWKS fetching, and issuer verification
 */

import { describe, expect, it, spyOn } from "bun:test";
import type { Shared } from "openbadges-types";
import {
  resolveIssuerDID,
  fetchIssuerJWKS,
  verifyIssuer,
} from "../../../src/services/verification/issuer-verifier.js";

describe("Issuer Verification Service", () => {
  describe("resolveIssuerDID", () => {
    it("should return null for non-DID URIs", async () => {
      const result = await resolveIssuerDID(
        "https://example.com" as Shared.IRI,
      );
      expect(result).toBeNull();
    });

    it("should return null for unsupported DID methods", async () => {
      const result = await resolveIssuerDID("did:unsupported:123" as Shared.IRI);
      expect(result).toBeNull();
    });

    it("should resolve did:key DIDs without network calls", async () => {
      const didKey =
        "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK" as Shared.IRI;
      const result = await resolveIssuerDID(didKey);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(didKey);
      expect(result?.verificationMethod).toBeArray();
      expect(result?.verificationMethod?.length).toBeGreaterThan(0);
    });

    it("should resolve did:web DIDs via HTTPS", async () => {
      const didWeb = "did:web:example.com" as Shared.IRI;
      const mockDidDoc = {
        id: didWeb,
        verificationMethod: [
          {
            id: `${didWeb}#key-1`,
            type: "JsonWebKey2020",
            controller: didWeb,
            publicKeyJwk: {
              kty: "RSA",
              n: "test",
              e: "AQAB",
            },
          },
        ],
      };

      // Mock fetch for did:web resolution
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockDidDoc,
      } as Response);

      const result = await resolveIssuerDID(didWeb);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(didWeb);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://example.com/.well-known/did.json",
      );

      fetchSpy.mockRestore();
    });

    it("should handle did:web network failures", async () => {
      const didWeb = "did:web:example.com" as Shared.IRI;

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await resolveIssuerDID(didWeb);

      expect(result).toBeNull();
      fetchSpy.mockRestore();
    });

    it("should handle malformed did:web responses", async () => {
      const didWeb = "did:web:example.com" as Shared.IRI;

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ id: "wrong-id" }),
      } as Response);

      const result = await resolveIssuerDID(didWeb);

      expect(result).toBeNull();
      fetchSpy.mockRestore();
    });
  });

  describe("fetchIssuerJWKS", () => {
    it("should extract embedded JWKS from DID document", async () => {
      const didDoc = {
        id: "did:key:test",
        verificationMethod: [
          {
            id: "did:key:test#key-1",
            type: "JsonWebKey2020",
            controller: "did:key:test",
            publicKeyJwk: {
              kty: "RSA",
              n: "test",
              e: "AQAB",
            },
          },
        ],
      };

      const result = await fetchIssuerJWKS(didDoc);

      expect(result.check.passed).toBe(true);
      expect(result.jwks).not.toBeNull();
      expect(result.jwks?.keys).toBeArray();
      expect(result.jwks?.keys.length).toBe(1);
      expect(result.check.details?.source).toBe("embedded");
    });

    it("should fetch remote JWKS from service endpoint", async () => {
      const didDoc = {
        id: "did:web:example.com",
        service: [
          {
            type: "JwksEndpoint",
            serviceEndpoint: "https://example.com/jwks",
          },
        ],
      };

      const mockJWKS = {
        keys: [
          {
            kty: "RSA",
            kid: "key-1",
            n: "test",
            e: "AQAB",
          },
        ],
      };

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      const result = await fetchIssuerJWKS(didDoc);

      expect(result.check.passed).toBe(true);
      expect(result.jwks).not.toBeNull();
      expect(result.jwks?.keys.length).toBe(1);
      expect(result.check.details?.source).toBe("remote");
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/jwks");

      fetchSpy.mockRestore();
    });

    it("should handle JWKS fetch failures", async () => {
      const didDoc = {
        id: "did:web:example.com",
        service: [
          {
            type: "JwksEndpoint",
            serviceEndpoint: "https://example.com/jwks",
          },
        ],
      };

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await fetchIssuerJWKS(didDoc);

      expect(result.check.passed).toBe(false);
      expect(result.jwks).toBeNull();
      expect(result.check.error).toContain("Failed to fetch JWKS");

      fetchSpy.mockRestore();
    });

    it("should handle empty JWKS responses", async () => {
      const didDoc = {
        id: "did:web:example.com",
        service: [
          {
            type: "JwksEndpoint",
            serviceEndpoint: "https://example.com/jwks",
          },
        ],
      };

      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [] }),
      } as Response);

      const result = await fetchIssuerJWKS(didDoc);

      expect(result.check.passed).toBe(false);
      expect(result.jwks).toBeNull();

      fetchSpy.mockRestore();
    });

    it("should fail when no JWKS found in DID document", async () => {
      const didDoc = {
        id: "did:web:example.com",
        verificationMethod: [],
      };

      const result = await fetchIssuerJWKS(didDoc);

      expect(result.check.passed).toBe(false);
      expect(result.jwks).toBeNull();
      expect(result.check.error).toContain("No JWKS URI or embedded keys");
    });
  });

  describe("verifyIssuer", () => {
    it("should verify issuer with embedded keys successfully", async () => {
      const didKey =
        "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK" as Shared.IRI;

      const checks = await verifyIssuer(didKey);

      expect(checks).toBeArray();
      expect(checks.length).toBe(2);

      const didCheck = checks.find((c) => c.check === "issuer-did-resolution");
      expect(didCheck?.passed).toBe(true);

      const jwksCheck = checks.find((c) => c.check === "issuer-jwks-fetch");
      expect(jwksCheck?.passed).toBe(true);
    });

    it("should fail verification for invalid DID", async () => {
      const checks = await verifyIssuer("not-a-did" as Shared.IRI);

      expect(checks).toBeArray();
      expect(checks.length).toBe(1);

      const didCheck = checks[0];
      expect(didCheck.check).toBe("issuer-did-resolution");
      expect(didCheck.passed).toBe(false);
      expect(didCheck.error).toContain("Failed to resolve DID");
    });

    it("should verify issuer with remote JWKS", async () => {
      const didWeb = "did:web:example.com" as Shared.IRI;
      const mockDidDoc = {
        id: didWeb,
        service: [
          {
            type: "JwksEndpoint",
            serviceEndpoint: "https://example.com/jwks",
          },
        ],
      };

      const mockJWKS = {
        keys: [
          {
            kty: "RSA",
            kid: "key-1",
            n: "test",
            e: "AQAB",
          },
        ],
      };

      const fetchSpy = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDidDoc,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJWKS,
        } as Response);

      const checks = await verifyIssuer(didWeb);

      expect(checks).toBeArray();
      expect(checks.length).toBe(2);
      expect(checks.every((c) => c.passed)).toBe(true);

      fetchSpy.mockRestore();
    });
  });
});
