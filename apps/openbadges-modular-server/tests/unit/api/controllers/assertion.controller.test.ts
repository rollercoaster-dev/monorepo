/**
 * Unit tests for AssertionController - specifically testing credentialStatus
 * in assertion creation response
 *
 * Tests for issue #326: Fix credentialStatus race condition on assertion creation
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { AssertionController } from "../../../../src/api/controllers/assertion.controller";
import type { AssertionRepository } from "../../../../src/domains/assertion/assertion.repository";
import type { BadgeClassRepository } from "../../../../src/domains/badgeClass/badgeClass.repository";
import type { IssuerRepository } from "../../../../src/domains/issuer/issuer.repository";
import type { CredentialStatusService } from "../../../../src/core/credential-status.service";
import { BadgeVersion } from "../../../../src/utils/version/badge-version";
import { StatusPurpose } from "../../../../src/domains/status-list/status-list.types";
import { Assertion } from "../../../../src/domains/assertion/assertion.entity";
import type { Shared, OB3 } from "openbadges-types";

// Mock data
const mockIssuerId = "urn:uuid:issuer-123" as Shared.IRI;
const mockBadgeClassId = "urn:uuid:badge-123" as Shared.IRI;
const mockAssertionId = "urn:uuid:assertion-123" as Shared.IRI;
const mockStatusListId = "status-list-123";

const mockIssuer = {
  id: mockIssuerId,
  type: "Issuer",
  name: "Test Issuer",
  url: "https://example.com" as Shared.IRI,
  toJsonLd: () => ({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: mockIssuerId,
    type: "Issuer",
    name: "Test Issuer",
    url: "https://example.com",
  }),
};

const mockBadgeClass = {
  id: mockBadgeClassId,
  type: "Achievement",
  name: "Test Badge",
  description: "A test badge",
  image: "https://example.com/badge.png" as Shared.IRI,
  criteria: { narrative: "Test criteria" },
  issuer: mockIssuerId,
  toJsonLd: () => ({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: mockBadgeClassId,
    type: ["Achievement"],
    name: "Test Badge",
    description: "A test badge",
    image: "https://example.com/badge.png",
    criteria: { narrative: "Test criteria" },
    issuer: mockIssuerId,
  }),
};

const mockCredentialStatus = {
  type: "BitstringStatusListEntry" as const,
  statusPurpose: StatusPurpose.REVOCATION,
  statusListIndex: "42",
  statusListCredential:
    `https://example.com/v3/status-lists/${mockStatusListId}` as Shared.IRI,
  statusSize: 1,
};

describe("AssertionController", () => {
  let assertionController: AssertionController;
  let mockAssertionRepository: AssertionRepository;
  let mockBadgeClassRepository: BadgeClassRepository;
  let mockIssuerRepository: IssuerRepository;
  let mockCredentialStatusService: CredentialStatusService;

  beforeEach(() => {
    // Create mock repositories
    mockAssertionRepository = {
      create: mock(async (assertion: Assertion) => {
        // Return the assertion with an ID
        const created = Assertion.create({
          ...assertion,
          id: mockAssertionId,
          issuer: mockIssuerId,
        });
        return created;
      }),
      update: mock(async (_id: Shared.IRI, data: Partial<Assertion>) => {
        const updated = Assertion.create({
          id: mockAssertionId,
          badgeClass: mockBadgeClassId,
          recipient: {
            type: "email",
            identity: "sha256$abc123",
            hashed: true,
          },
          issuedOn: new Date().toISOString(),
          issuer: mockIssuerId,
          ...data,
        });
        return updated;
      }),
      findById: mock(async () => null),
      findAll: mock(async () => []),
      findByBadgeClass: mock(async () => []),
      delete: mock(async () => true),
      revoke: mock(async () => null),
      createBatch: mock(async (assertions: Omit<Assertion, "id">[]) => {
        // Return batch results with IDs
        return assertions.map((assertion, index) => ({
          success: true,
          assertion: Assertion.create({
            ...assertion,
            id: `urn:uuid:assertion-${index}` as Shared.IRI,
            issuer: mockIssuerId,
          }),
        }));
      }),
      findByIds: mock(async (ids: Shared.IRI[]) => {
        // Return assertions for the given IDs
        return ids.map((id, index) => {
          const assertion = Assertion.create({
            id,
            badgeClass: mockBadgeClassId,
            recipient: {
              type: "email",
              identity: `recipient${index}@example.com`,
              hashed: false,
            },
            issuedOn: new Date().toISOString(),
            issuer: mockIssuerId,
          });
          return assertion;
        });
      }),
    } as unknown as AssertionRepository;

    mockBadgeClassRepository = {
      findById: mock(async () => mockBadgeClass),
      findAll: mock(async () => []),
      create: mock(async () => mockBadgeClass),
      update: mock(async () => mockBadgeClass),
      delete: mock(async () => true),
    } as unknown as BadgeClassRepository;

    mockIssuerRepository = {
      findById: mock(async () => mockIssuer),
      findAll: mock(async () => []),
      create: mock(async () => mockIssuer),
      update: mock(async () => mockIssuer),
      delete: mock(async () => true),
    } as unknown as IssuerRepository;

    mockCredentialStatusService = {
      assignCredentialStatus: mock(async () => ({
        success: true,
        credentialStatus: mockCredentialStatus,
        statusEntry: {
          id: "entry-1",
          credentialId: mockAssertionId,
          statusListId: mockStatusListId,
          statusListIndex: 42,
          statusSize: 1,
          purpose: StatusPurpose.REVOCATION,
          currentStatus: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
    } as unknown as CredentialStatusService;

    assertionController = new AssertionController(
      mockAssertionRepository,
      mockBadgeClassRepository,
      mockIssuerRepository,
      mockCredentialStatusService,
    );
  });

  describe("createAssertion", () => {
    it("should include credentialStatus in the response for OB3 assertions", async () => {
      // Arrange
      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V3,
        false, // sign=false to simplify test
      );

      // Assert - The main test: credentialStatus MUST be present in the response
      expect(result).toBeDefined();
      expect(result.credentialStatus).toBeDefined();
      expect(result.credentialStatus).toEqual(mockCredentialStatus);

      // Verify the assignCredentialStatus was called
      expect(
        mockCredentialStatusService.assignCredentialStatus,
      ).toHaveBeenCalled();

      // Verify the repository update was called with credentialStatus
      expect(mockAssertionRepository.update).toHaveBeenCalled();
    });

    it("should NOT include credentialStatus for OB2 assertions", async () => {
      // Arrange
      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V2,
        false, // sign=false to simplify test
      );

      // Assert - OB2 assertions should not have credentialStatus
      expect(result).toBeDefined();
      expect(
        (result as OB3.VerifiableCredential).credentialStatus,
      ).toBeUndefined();

      // Verify the assignCredentialStatus was NOT called for OB2
      expect(
        mockCredentialStatusService.assignCredentialStatus,
      ).not.toHaveBeenCalled();
    });

    it("should still return assertion if credentialStatus assignment fails", async () => {
      // Arrange - Make credential status service fail
      mockCredentialStatusService.assignCredentialStatus = mock(async () => ({
        success: false,
        error: "Status list full",
      }));

      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V3,
        false,
      );

      // Assert - Assertion should still be returned, but without credentialStatus
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // credentialStatus should be undefined because assignment failed
      expect(
        (result as OB3.VerifiableCredential).credentialStatus,
      ).toBeUndefined();
    });

    it("should handle credentialStatus service exceptions gracefully", async () => {
      // Arrange - Make credential status service throw
      mockCredentialStatusService.assignCredentialStatus = mock(async () => {
        throw new Error("Database connection failed");
      });

      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act - Should not throw
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V3,
        false,
      );

      // Assert - Assertion should still be returned without credentialStatus
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should NOT assign credentialStatus when service is not provided", async () => {
      // Arrange - Create controller without credential status service
      const controllerWithoutService = new AssertionController(
        mockAssertionRepository,
        mockBadgeClassRepository,
        mockIssuerRepository,
        // No credentialStatusService provided
      );

      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await controllerWithoutService.createAssertion(
        createDto,
        BadgeVersion.V3,
        false,
      );

      // Assert - Should return assertion without credentialStatus
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(
        (result as OB3.VerifiableCredential).credentialStatus,
      ).toBeUndefined();
    });

    it("should create v3 assertion with OB3 type array", async () => {
      // Arrange
      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V3,
        false,
      );

      // Assert - V3 assertions should have type array
      expect(result).toBeDefined();
      expect(Array.isArray(result.type)).toBe(true);
      const types = result.type as string[];
      expect(types).toContain("VerifiableCredential");
      expect(types).toContain("OpenBadgeCredential");
    });

    it("should create v2 assertion with OB2 type string", async () => {
      // Arrange
      const createDto = {
        badge: mockBadgeClassId,
        recipient: {
          type: "email",
          identity: "sha256$abc123",
          hashed: true,
        },
        issuedOn: new Date().toISOString(),
      };

      // Act
      const result = await assertionController.createAssertion(
        createDto,
        BadgeVersion.V2,
        false,
      );

      // Assert - V2 assertions should have type string
      expect(result).toBeDefined();
      expect(typeof result.type).toBe("string");
      expect(result.type).toBe("Assertion");
    });
  });

  describe("createAssertionsBatch", () => {
    it("should create v3 assertions with OB3 type array", async () => {
      // Arrange
      const batchDto = {
        credentials: [
          {
            badge: mockBadgeClassId,
            recipient: {
              type: "email",
              identity: "sha256$abc123",
              hashed: true,
            },
            issuedOn: new Date().toISOString(),
          },
          {
            badge: mockBadgeClassId,
            recipient: {
              type: "email",
              identity: "sha256$def456",
              hashed: true,
            },
            issuedOn: new Date().toISOString(),
          },
        ],
      };

      // Act
      const result = await assertionController.createAssertionsBatch(
        batchDto,
        BadgeVersion.V3,
        false,
      );

      // Assert - All V3 assertions should have type array
      expect(result.summary.successful).toBe(2);
      for (const res of result.results) {
        if (res.success && res.data) {
          expect(Array.isArray(res.data.type)).toBe(true);
          const types = res.data.type as string[];
          expect(types).toContain("VerifiableCredential");
          expect(types).toContain("OpenBadgeCredential");
        }
      }
    });

    it("should create v2 assertions with OB2 type string", async () => {
      // Arrange
      const batchDto = {
        credentials: [
          {
            badge: mockBadgeClassId,
            recipient: {
              type: "email",
              identity: "sha256$abc123",
              hashed: true,
            },
            issuedOn: new Date().toISOString(),
          },
          {
            badge: mockBadgeClassId,
            recipient: {
              type: "email",
              identity: "sha256$def456",
              hashed: true,
            },
            issuedOn: new Date().toISOString(),
          },
        ],
      };

      // Act
      const result = await assertionController.createAssertionsBatch(
        batchDto,
        BadgeVersion.V2,
        false,
      );

      // Assert - All V2 assertions should have type string
      expect(result.summary.successful).toBe(2);
      for (const res of result.results) {
        if (res.success && res.data) {
          expect(typeof res.data.type).toBe("string");
          expect(res.data.type).toBe("Assertion");
        }
      }
    });
  });
});
