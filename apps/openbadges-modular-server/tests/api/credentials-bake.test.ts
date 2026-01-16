/**
 * Unit tests for bake credential endpoint
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Shared, OB3 } from "openbadges-types";
import { CredentialsController } from "../../src/api/controllers/credentials.controller";
import type { AssertionRepository } from "../../src/domains/assertion/assertion.repository";
import type { BadgeClassRepository } from "../../src/domains/badgeClass/badgeClass.repository";
import type { IssuerRepository } from "../../src/domains/issuer/issuer.repository";
import type {
  BakingService,
  BakedImage,
} from "../../src/services/baking/types";
import type { BakeRequestDto } from "../../src/api/dtos";
import { Assertion } from "../../src/domains/assertion/assertion.entity";
import { BadgeClass } from "../../src/domains/badgeClass/badgeClass.entity";
import { Issuer } from "../../src/domains/issuer/issuer.entity";
import { BadRequestError } from "../../src/infrastructure/errors/bad-request.error";

// Sample test fixtures
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // 1x1 red pixel PNG
const SAMPLE_SVG_BASE64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
).toString("base64");

const SAMPLE_CREDENTIAL_ID = "urn:uuid:test-credential-123" as Shared.IRI;

// Mock dependencies
const mockAssertionRepository: Partial<AssertionRepository> = {
  findById: mock(),
};

const mockBadgeClassRepository: Partial<BadgeClassRepository> = {
  findById: mock(),
};

const mockIssuerRepository: Partial<IssuerRepository> = {
  findById: mock(),
};

const mockBakingService: Partial<BakingService> = {
  bake: mock(),
  unbake: mock(),
  detectFormat: mock(),
  isBaked: mock(),
};

describe("Bake Credential Endpoint Unit Tests", () => {
  let credentialsController: CredentialsController;
  let mockAssertion: Assertion;
  let mockBadgeClass: BadgeClass;
  let mockIssuer: Issuer;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockAssertionRepository).forEach((mockFn) => {
      if (typeof mockFn === "function" && "mockReset" in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });
    Object.values(mockBadgeClassRepository).forEach((mockFn) => {
      if (typeof mockFn === "function" && "mockReset" in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });
    Object.values(mockIssuerRepository).forEach((mockFn) => {
      if (typeof mockFn === "function" && "mockReset" in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });
    Object.values(mockBakingService).forEach((mockFn) => {
      if (typeof mockFn === "function" && "mockReset" in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });

    // Create controller with mocked dependencies
    credentialsController = new CredentialsController(
      mockAssertionRepository as AssertionRepository,
      mockBadgeClassRepository as BadgeClassRepository,
      mockIssuerRepository as IssuerRepository,
      mockBakingService as BakingService,
    );

    // Create a mock issuer
    mockIssuer = Issuer.create({
      id: "urn:uuid:issuer-123" as Shared.IRI,
      name: "Test Issuer",
      url: "https://example.com" as Shared.IRI,
      email: "issuer@example.com",
    });

    // Create a mock badge class
    mockBadgeClass = BadgeClass.create({
      id: "urn:uuid:badge-class-123" as Shared.IRI,
      name: "Test Badge",
      description: "Test Badge Description",
      issuer: mockIssuer.id,
      criteria: {
        narrative: "Test criteria",
      },
    });

    // Create a mock assertion
    mockAssertion = Assertion.create({
      id: SAMPLE_CREDENTIAL_ID,
      recipient: {
        id: "did:example:recipient123" as Shared.IRI,
        type: "Profile",
      } as OB3.CredentialSubject,
      badgeClass: mockBadgeClass.id,
      issuer: mockIssuer.id,
      issuedOn: "2023-01-01T00:00:00Z",
    });
  });

  describe("Successful baking operations", () => {
    it("should successfully bake a credential into a PNG image", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      const mockBakedImage: BakedImage = {
        data: Buffer.from("baked-png-data"),
        mimeType: "image/png",
        format: "png",
        size: 1024,
        compressed: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockResolvedValue(mockBakedImage);

      // Act
      const result = await credentialsController.bakeCredential(
        SAMPLE_CREDENTIAL_ID,
        bakeRequest,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.format).toBe("png");
      expect(result!.mimeType).toBe("image/png");
      expect(result!.size).toBe(1024);
      expect(result!.data).toBe(
        Buffer.from("baked-png-data").toString("base64"),
      );
      expect(mockBakingService.bake).toHaveBeenCalledTimes(1);
    });

    it("should successfully bake a credential into an SVG image", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "svg",
        image: SAMPLE_SVG_BASE64,
      };

      const mockBakedImage: BakedImage = {
        data: Buffer.from("baked-svg-data"),
        mimeType: "image/svg+xml",
        format: "svg",
        size: 2048,
        compressed: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockResolvedValue(mockBakedImage);

      // Act
      const result = await credentialsController.bakeCredential(
        SAMPLE_CREDENTIAL_ID,
        bakeRequest,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.format).toBe("svg");
      expect(result!.mimeType).toBe("image/svg+xml");
      expect(result!.size).toBe(2048);
      expect(result!.data).toBe(
        Buffer.from("baked-svg-data").toString("base64"),
      );
      expect(mockBakingService.bake).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling - Not found (404)", () => {
    it("should return null when credential does not exist", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      const validCredentialId =
        "urn:uuid:non-existent-credential" as Shared.IRI;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(null);

      // Act
      const result = await credentialsController.bakeCredential(
        validCredentialId,
        bakeRequest,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockBakingService.bake).not.toHaveBeenCalled();
    });
  });

  describe("Error handling - Bad request (400)", () => {
    it("should throw BadRequestError for unsupported image format", async () => {
      // Arrange
      const bakeRequest = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        format: "jpg" as any, // Unsupported format
        image: SAMPLE_PNG_BASE64,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );

      // Act & Assert
      await expect(
        credentialsController.bakeCredential(SAMPLE_CREDENTIAL_ID, bakeRequest),
      ).rejects.toThrow(BadRequestError);
      expect(mockBakingService.bake).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError when baking service fails", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // Mock baking service to throw an error (e.g., malformed image)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockRejectedValue(
        new Error(
          "Unsupported image format: unable to detect PNG or SVG format",
        ),
      );

      // Act & Assert
      await expect(
        credentialsController.bakeCredential(SAMPLE_CREDENTIAL_ID, bakeRequest),
      ).rejects.toThrow("Failed to bake credential");
    });

    it("should throw BadRequestError for empty image data", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: "", // Empty string
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );

      // Act & Assert
      await expect(
        credentialsController.bakeCredential(SAMPLE_CREDENTIAL_ID, bakeRequest),
      ).rejects.toThrow(BadRequestError);
      expect(mockBakingService.bake).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError for invalid credential ID format", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      // Act & Assert
      await expect(
        credentialsController.bakeCredential("", bakeRequest),
      ).rejects.toThrow(BadRequestError);
      expect(mockAssertionRepository.findById).not.toHaveBeenCalled();
      expect(mockBakingService.bake).not.toHaveBeenCalled();
    });
  });

  describe("Error handling - Internal errors (500)", () => {
    it("should handle baking service errors gracefully", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockRejectedValue(
        new Error("Baking service internal error"),
      );

      // Act & Assert
      await expect(
        credentialsController.bakeCredential(SAMPLE_CREDENTIAL_ID, bakeRequest),
      ).rejects.toThrow("Failed to bake credential");
    });

    it("should handle repository errors gracefully", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockRejectedValue(
        new Error("Database connection error"),
      );

      // Act & Assert
      await expect(
        credentialsController.bakeCredential(SAMPLE_CREDENTIAL_ID, bakeRequest),
      ).rejects.toThrow("Failed to bake credential");
      expect(mockBakingService.bake).not.toHaveBeenCalled();
    });
  });

  describe("Response structure validation", () => {
    it("should return response matching BakeResponseDto structure", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      const mockBakedImage: BakedImage = {
        data: Buffer.from("test-baked-data"),
        mimeType: "image/png",
        format: "png",
        size: 512,
        compressed: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockResolvedValue(mockBakedImage);

      // Act
      const result = await credentialsController.bakeCredential(
        SAMPLE_CREDENTIAL_ID,
        bakeRequest,
      );

      // Assert - Verify all required fields exist
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("mimeType");
      expect(result).toHaveProperty("size");
      expect(result).toHaveProperty("format");
      expect(typeof result!.data).toBe("string");
      expect(typeof result!.size).toBe("number");
    });
  });

  describe("Baking service integration", () => {
    it("should call baking service with correct parameters", async () => {
      // Arrange
      const bakeRequest: BakeRequestDto = {
        format: "png",
        image: SAMPLE_PNG_BASE64,
      };

      const mockBakedImage: BakedImage = {
        data: Buffer.from("baked-data"),
        mimeType: "image/png",
        format: "png",
        size: 1024,
        compressed: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findById as any).mockResolvedValue(
        mockAssertion,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockIssuerRepository.findById as any).mockResolvedValue(mockIssuer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBakingService.bake as any).mockResolvedValue(mockBakedImage);

      // Act
      await credentialsController.bakeCredential(
        SAMPLE_CREDENTIAL_ID,
        bakeRequest,
      );

      // Assert - Verify baking service was called with correct arguments
      expect(mockBakingService.bake).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [imageBuffer, credential, options] = (mockBakingService.bake as any)
        .mock.calls[0];
      expect(Buffer.isBuffer(imageBuffer)).toBe(true);
      expect(credential).toBeDefined();
      expect(options.format).toBe("png");
    });
  });
});
