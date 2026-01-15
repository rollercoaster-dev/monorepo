/**
 * Credentials controller for Open Badges API
 *
 * This file defines the controller for credential-specific operations,
 * such as baking credentials into badge images.
 */

import type { AssertionRepository } from "../../domains/assertion/assertion.repository";
import type { BakingService } from "../../services/baking/types";
import type { BakeRequestDto, BakeResponseDto } from "../dtos";
import { BadRequestError } from "../../infrastructure/errors/bad-request.error";
import { logger } from "../../utils/logging/logger.service";
import type { OB2, OB3 } from "openbadges-types";
import { toIRI } from "../../utils/types/iri-utils";

/**
 * Controller for credential-specific operations
 */
export class CredentialsController {
  /**
   * Constructor
   * @param assertionRepository The assertion repository for fetching credentials
   * @param bakingService The baking service for embedding credentials
   */
  constructor(
    private assertionRepository: AssertionRepository,
    private bakingService: BakingService,
  ) {}

  /**
   * Bake a credential into an image
   *
   * Takes a credential ID and image data, retrieves the credential from the database,
   * and embeds it into the provided image using the baking service.
   *
   * @param credentialId - The ID of the credential to bake
   * @param data - The bake request data (format and base64-encoded image)
   * @returns The baked image response with base64-encoded data, or null if credential not found
   * @throws BadRequestError if image data is invalid or format unsupported
   */
  async bakeCredential(
    credentialId: string,
    data: BakeRequestDto,
  ): Promise<BakeResponseDto | null> {
    try {
      // Convert string ID to IRI for repository lookup
      const credentialIri = toIRI(credentialId);
      if (!credentialIri) {
        logger.warn("Invalid credential ID format", { credentialId });
        throw new BadRequestError("Invalid credential ID format");
      }

      // Fetch the credential from repository
      logger.debug("Fetching credential for baking", { credentialId });
      const assertion = await this.assertionRepository.findById(credentialIri);

      if (!assertion) {
        logger.warn("Credential not found for baking", { credentialId });
        return null; // Router will handle 404 response
      }

      // Validate format
      if (data.format !== "png" && data.format !== "svg") {
        throw new BadRequestError(
          `Unsupported format: ${data.format}. Must be 'png' or 'svg'`,
        );
      }

      // Decode base64 image data to Buffer
      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(data.image, "base64");
      } catch (error) {
        logger.error("Failed to decode base64 image data", { error });
        throw new BadRequestError("Invalid base64 image data");
      }

      // Validate that we got actual data
      if (imageBuffer.length === 0) {
        throw new BadRequestError("Image data is empty");
      }

      // Convert assertion to credential format (OB2 or OB3)
      // The assertion entity has toJsonLd method which returns the credential
      const credential = assertion.toJsonLd() as
        | OB2.Assertion
        | OB3.VerifiableCredential;

      // Call baking service to embed credential
      logger.debug("Baking credential into image", {
        credentialId,
        format: data.format,
        imageSize: imageBuffer.length,
      });

      const bakedResult = await this.bakingService.bake(
        imageBuffer,
        credential,
        {
          format: data.format,
        },
      );

      // Encode baked image to base64
      const base64Data = bakedResult.data.toString("base64");

      logger.info("Successfully baked credential into image", {
        credentialId,
        format: bakedResult.format,
        originalSize: imageBuffer.length,
        bakedSize: bakedResult.size,
      });

      // Return response DTO
      return {
        data: base64Data,
        mimeType: bakedResult.mimeType,
        size: bakedResult.size,
        format: bakedResult.format,
      };
    } catch (error) {
      // Re-throw known errors
      if (error instanceof BadRequestError) {
        throw error;
      }

      // Log and wrap unexpected errors
      logger.error("Error baking credential", {
        credentialId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `Failed to bake credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
