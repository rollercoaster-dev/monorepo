// src/services/BadgeVerificationService.ts
import type { OB2, OB3 } from "@/types";
import { validateBadge, isBadge, isOB2Profile } from "openbadges-types";
import {
  isOB2Assertion,
  isOB3VerifiableCredential,
  validateOB3Context,
  OB2Guards,
  OB3Guards,
} from "@utils/type-helpers";

/**
 * Result of a badge verification operation
 */
export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  verificationMethod?: "hosted" | "signed";
  expirationStatus?: "valid" | "expired" | "not-applicable";
  revocationStatus?: "valid" | "revoked" | "unknown";
  badgeVersion?: "OB2" | "OB3";
  structureValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  contentValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Service for verifying badge authenticity
 */
export class BadgeVerificationService {
  /**
   * Verifies a badge assertion
   * @param badge The badge to verify
   * @returns Verification result
   */
  static async verifyBadge(
    badge: OB2.Assertion | OB3.VerifiableCredential,
  ): Promise<VerificationResult> {
    // Initialize result
    const result: VerificationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      structureValidation: {
        isValid: false,
        errors: [],
        warnings: [],
      },
      contentValidation: {
        isValid: false,
        errors: [],
        warnings: [],
      },
    };

    try {
      // First, validate the badge structure using openbadges-types validation
      const validationResult = validateBadge(badge);

      // Store the validation results
      result.structureValidation = {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      };

      // Set the badge version
      result.badgeVersion = validationResult.version;

      // If the badge structure is invalid, we can't proceed with further verification
      if (!validationResult.isValid) {
        result.errors.push("Badge structure validation failed");
        result.errors = result.errors.concat(validationResult.errors);
        result.warnings = result.warnings.concat(validationResult.warnings);
        return result;
      }

      // Determine badge type and call appropriate verification method
      if (isOB2Assertion(badge)) {
        return await this.verifyOB2Badge(badge, result);
      } else if (isOB3VerifiableCredential(badge)) {
        return await this.verifyOB3Badge(badge, result);
      } else {
        result.errors.push("Unknown badge format");
        return result;
      }
    } catch (error) {
      result.errors.push(
        `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  /**
   * Verifies an Open Badges 2.0 assertion
   * @param badge The OB2 badge to verify
   * @param result The verification result to update
   * @returns Verification result
   */
  private static async verifyOB2Badge(
    badge: OB2.Assertion,
    result: VerificationResult,
  ): Promise<VerificationResult> {
    // Set badge version
    result.badgeVersion = "OB2";

    // Initialize content validation
    result.contentValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Perform detailed validation of badge components using type guards
    this.validateOB2Components(badge, result);

    // Check if badge has verification information
    if (!badge.verification) {
      result.contentValidation.errors.push(
        "Badge is missing verification information",
      );
      result.contentValidation.isValid = false;
    } else {
      // Determine verification method
      const verificationType =
        typeof badge.verification.type === "string"
          ? badge.verification.type
          : Array.isArray(badge.verification.type)
            ? badge.verification.type[0]
            : null;

      if (!verificationType) {
        result.contentValidation.errors.push(
          "Badge has invalid verification type",
        );
        result.contentValidation.isValid = false;
      } else {
        // Normalize verification type (handle aliases)
        const normalizedType = this.normalizeVerificationType(verificationType);
        result.verificationMethod = normalizedType as "hosted" | "signed";

        // Verify based on verification type
        if (normalizedType === "hosted") {
          await this.verifyHostedBadge(badge, result);
        } else if (normalizedType === "signed") {
          await this.verifySignedBadge(badge, result);
        } else {
          result.contentValidation.errors.push(
            `Unsupported verification type: ${verificationType}`,
          );
          result.contentValidation.isValid = false;
        }
      }
    }

    // Check expiration
    this.checkExpiration(badge, result);

    // Ensure expirationStatus is set even if badge is not expired
    if (!result.expirationStatus) {
      result.expirationStatus = "not-applicable";
    }

    // Check revocation
    await this.checkRevocation(badge, result);

    // Ensure revocationStatus is set even if badge is not revoked
    if (!result.revocationStatus) {
      result.revocationStatus = "valid";
    }

    // Update overall result based on content validation
    if (!result.contentValidation.isValid) {
      result.errors = result.errors.concat(result.contentValidation.errors);
      result.warnings = result.warnings.concat(
        result.contentValidation.warnings,
      );
    }

    // Ensure that if any content validation errors exist, isValid is set to false
    if (result.contentValidation.errors.length > 0) {
      result.contentValidation.isValid = false;
    }

    // Badge is valid if both structure and content validations pass
    result.isValid =
      result.structureValidation?.isValid === true &&
      result.contentValidation.isValid === true &&
      result.errors.length === 0;
    return result;
  }

  /**
   * Validates the components of an OB2 badge using type guards
   * @param badge The OB2 badge to validate
   * @param result The verification result to update
   */
  private static validateOB2Components(
    badge: OB2.Assertion,
    result: VerificationResult,
  ): void {
    // Validate badge class
    if (typeof badge.badge === "object") {
      if (!isBadge(badge.badge)) {
        result.contentValidation.errors.push("Invalid BadgeClass structure");
        result.contentValidation.isValid = false;
      } else {
        // Validate badge class components
        if (!badge.badge.name || badge.badge.name.trim() === "") {
          result.contentValidation.errors.push("BadgeClass is missing a name");
          result.contentValidation.isValid = false;
        }

        if (!badge.badge.description || badge.badge.description.trim() === "") {
          result.contentValidation.errors.push(
            "BadgeClass is missing a description",
          );
          result.contentValidation.isValid = false;
        }

        // Validate image
        if (!badge.badge.image) {
          result.contentValidation.errors.push(
            "BadgeClass is missing an image",
          );
          result.contentValidation.isValid = false;
        } else if (
          typeof badge.badge.image === "object" &&
          !OB2Guards.isImage(badge.badge.image)
        ) {
          result.contentValidation.errors.push(
            "BadgeClass has an invalid image structure",
          );
          result.contentValidation.isValid = false;
        }

        // Validate criteria
        if (
          badge.badge.criteria &&
          !OB2Guards.isCriteria(badge.badge.criteria)
        ) {
          result.contentValidation.errors.push(
            "BadgeClass has an invalid criteria structure",
          );
          result.contentValidation.isValid = false;
        }

        // Validate issuer
        if (!badge.badge.issuer) {
          result.contentValidation.errors.push(
            "BadgeClass is missing an issuer",
          );
          result.contentValidation.isValid = false;
        } else if (
          typeof badge.badge.issuer === "object" &&
          !isOB2Profile(badge.badge.issuer)
        ) {
          result.contentValidation.errors.push(
            "BadgeClass has an invalid issuer structure",
          );
          result.contentValidation.isValid = false;
        } else if (typeof badge.badge.issuer === "object") {
          // Validate issuer components
          if (
            !badge.badge.issuer.name ||
            badge.badge.issuer.name.trim() === ""
          ) {
            result.contentValidation.errors.push("Issuer is missing a name");
            result.contentValidation.isValid = false;
          }

          // Validate issuer URL if present
          if (
            badge.badge.issuer.url &&
            typeof badge.badge.issuer.url === "string"
          ) {
            try {
              new URL(badge.badge.issuer.url);
            } catch (e) {
              result.contentValidation.errors.push("Issuer has an invalid URL");
              result.contentValidation.isValid = false;
            }
          }
        }

        // Validate alignment if present
        if (badge.badge.alignment) {
          if (Array.isArray(badge.badge.alignment)) {
            for (const alignment of badge.badge.alignment) {
              if (!OB2Guards.isAlignmentObject(alignment)) {
                result.contentValidation.errors.push(
                  "BadgeClass has an invalid alignment structure",
                );
                result.contentValidation.isValid = false;
                break;
              }
            }
          } else if (!OB2Guards.isAlignmentObject(badge.badge.alignment)) {
            result.contentValidation.errors.push(
              "BadgeClass has an invalid alignment structure",
            );
            result.contentValidation.isValid = false;
          }
        }
      }
    } else if (typeof badge.badge === "string") {
      // If badge is a string reference, it should be a valid URL
      try {
        new URL(badge.badge);
      } catch (e) {
        result.contentValidation.errors.push(
          "BadgeClass reference is not a valid URL",
        );
        result.contentValidation.isValid = false;
      }
    } else {
      result.contentValidation.errors.push("Badge is missing a BadgeClass");
      result.contentValidation.isValid = false;
    }

    // Validate recipient
    if (!badge.recipient) {
      result.contentValidation.errors.push("Badge is missing a recipient");
      result.contentValidation.isValid = false;
    } else if (!OB2Guards.isIdentityObject(badge.recipient)) {
      result.contentValidation.errors.push(
        "Badge has an invalid recipient structure",
      );
      result.contentValidation.isValid = false;
    } else {
      // Validate recipient components
      if (!badge.recipient.identity) {
        result.contentValidation.errors.push(
          "Recipient is missing an identity",
        );
        result.contentValidation.isValid = false;
      }

      if (!badge.recipient.type) {
        result.contentValidation.errors.push("Recipient is missing a type");
        result.contentValidation.isValid = false;
      }

      if (badge.recipient.hashed === undefined) {
        result.contentValidation.warnings.push(
          "Recipient is missing the hashed property",
        );
      }
    }

    // Validate verification
    if (!badge.verification) {
      result.contentValidation.errors.push(
        "Badge is missing verification information",
      );
      result.contentValidation.isValid = false;
    } else if (!OB2Guards.isVerificationObject(badge.verification)) {
      result.contentValidation.errors.push(
        "Badge has an invalid verification structure",
      );
      result.contentValidation.isValid = false;
    }

    // Validate issuedOn
    if (!badge.issuedOn) {
      result.contentValidation.errors.push("Badge is missing an issuedOn date");
      result.contentValidation.isValid = false;
    } else {
      try {
        new Date(badge.issuedOn as string);
      } catch (e) {
        result.contentValidation.errors.push(
          "Badge has an invalid issuedOn date",
        );
        result.contentValidation.isValid = false;
      }
    }

    // Validate evidence if present
    if (badge.evidence) {
      if (Array.isArray(badge.evidence)) {
        for (const evidence of badge.evidence) {
          if (typeof evidence === "object" && !OB2Guards.isEvidence(evidence)) {
            result.contentValidation.errors.push(
              "Badge has an invalid evidence structure",
            );
            result.contentValidation.isValid = false;
            break;
          }
        }
      } else if (
        typeof badge.evidence === "object" &&
        !OB2Guards.isEvidence(badge.evidence)
      ) {
        result.contentValidation.errors.push(
          "Badge has an invalid evidence structure",
        );
        result.contentValidation.isValid = false;
      }
    }

    // After all validation, ensure contentValidation.isValid is correct
    result.contentValidation.isValid =
      result.contentValidation.errors.length === 0;
  }

  /**
   * Verifies an Open Badges 3.0 verifiable credential
   * @param badge The OB3 badge to verify
   * @param result The verification result to update
   * @returns Verification result
   */
  private static async verifyOB3Badge(
    badge: OB3.VerifiableCredential,
    result: VerificationResult,
  ): Promise<VerificationResult> {
    // Set badge version
    result.badgeVersion = "OB3";

    // Initialize content validation
    result.contentValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Perform detailed validation of badge components using type guards
    this.validateOB3Components(badge, result);

    // OB3 uses the W3C Verifiable Credentials model
    // Check for proof property which is required for verification
    if (!badge.proof) {
      result.contentValidation.errors.push(
        "OB3 credential is missing proof information",
      );
      result.contentValidation.isValid = false;
    } else {
      // Determine proof type
      const proofType = badge.proof.type;
      if (!proofType) {
        result.contentValidation.errors.push(
          "OB3 credential has invalid proof type",
        );
        result.contentValidation.isValid = false;
      } else {
        // Currently, we'll add a warning as full cryptographic verification
        // of OB3 credentials requires additional libraries and is complex
        result.contentValidation.warnings.push(
          "Full cryptographic verification of OB3 credentials is not yet implemented",
        );
        result.verificationMethod = "signed";

        // Validate proof components
        if (!OB3Guards.isProof(badge.proof)) {
          result.contentValidation.errors.push(
            "OB3 credential has an invalid proof structure",
          );
          result.contentValidation.isValid = false;
        } else {
          // Check required proof properties
          if (!badge.proof.created) {
            result.contentValidation.errors.push(
              "Proof is missing a creation date",
            );
            result.contentValidation.isValid = false;
          }

          if (!badge.proof.verificationMethod) {
            result.contentValidation.errors.push(
              "Proof is missing a verification method",
            );
            result.contentValidation.isValid = false;
          }

          if (!badge.proof.proofPurpose) {
            result.contentValidation.errors.push(
              "Proof is missing a proof purpose",
            );
            result.contentValidation.isValid = false;
          }

          if (!badge.proof.proofValue) {
            result.contentValidation.errors.push(
              "Proof is missing a proof value",
            );
            result.contentValidation.isValid = false;
          }
        }
      }
    }

    // Check expiration
    this.checkExpiration(badge, result);

    // Check credential status if present
    if (badge.credentialStatus) {
      if (!OB3Guards.isCredentialStatus(badge.credentialStatus)) {
        result.contentValidation.errors.push(
          "OB3 credential has an invalid credential status structure",
        );
        result.contentValidation.isValid = false;
      } else {
        // Check required credential status properties
        if (!badge.credentialStatus.id) {
          result.contentValidation.errors.push(
            "Credential status is missing an ID",
          );
          result.contentValidation.isValid = false;
        }

        if (!badge.credentialStatus.type) {
          result.contentValidation.errors.push(
            "Credential status is missing a type",
          );
          result.contentValidation.isValid = false;
        }

        // Add a warning about credential status checking
        result.contentValidation.warnings.push(
          "Credential status checking requires network access to validate against the status endpoint",
        );
      }
    } else {
      // Add a warning about missing credential status
      result.contentValidation.warnings.push(
        "OB3 credential does not specify a credential status",
      );
    }

    // Update overall result based on content validation
    if (!result.contentValidation.isValid) {
      result.errors = result.errors.concat(result.contentValidation.errors);
      result.warnings = result.warnings.concat(
        result.contentValidation.warnings,
      );
    }

    // Badge is valid if both structure and content validations pass
    result.isValid =
      result.structureValidation?.isValid === true &&
      result.contentValidation.isValid === true &&
      result.errors.length === 0;
    return result;
  }

  /**
   * Validates the components of an OB3 badge using type guards
   * @param badge The OB3 badge to validate
   * @param result The verification result to update
   */
  private static validateOB3Components(
    badge: OB3.VerifiableCredential,
    result: VerificationResult,
  ): void {
    // Validate @context using the unified validateOB3Context function
    // This supports string, array, and object formats per the OB3 spec
    const contextValidation = validateOB3Context(badge["@context"]);
    if (!contextValidation.valid) {
      result.contentValidation.errors.push(
        contextValidation.error || "OB3 credential has invalid @context",
      );
      result.contentValidation.isValid = false;
    }

    // Validate type
    if (!badge.type || !Array.isArray(badge.type)) {
      result.contentValidation.errors.push(
        "OB3 credential is missing a valid type",
      );
      result.contentValidation.isValid = false;
    } else {
      // Check for required types
      const hasVCType = badge.type.includes("VerifiableCredential");
      const hasOBType = badge.type.includes("OpenBadgeCredential");

      if (!hasVCType) {
        result.contentValidation.errors.push(
          "OB3 credential is missing the VerifiableCredential type",
        );
        result.contentValidation.isValid = false;
      }

      if (!hasOBType) {
        result.contentValidation.errors.push(
          "OB3 credential is missing the OpenBadgeCredential type",
        );
        result.contentValidation.isValid = false;
      }
    }

    // Validate issuer
    if (!badge.issuer) {
      result.contentValidation.errors.push(
        "OB3 credential is missing an issuer",
      );
      result.contentValidation.isValid = false;
    } else if (!OB3Guards.isIssuer(badge.issuer)) {
      result.contentValidation.errors.push(
        "OB3 credential has an invalid issuer structure",
      );
      result.contentValidation.isValid = false;
    } else {
      // Validate issuer components
      if (!badge.issuer.id) {
        result.contentValidation.errors.push("Issuer is missing an ID");
        result.contentValidation.isValid = false;
      }

      if (!badge.issuer.type) {
        result.contentValidation.errors.push("Issuer is missing a type");
        result.contentValidation.isValid = false;
      }

      if (!badge.issuer.name) {
        result.contentValidation.warnings.push("Issuer is missing a name");
      }
    }

    // Validate issuance date
    if (!badge.issuanceDate) {
      result.contentValidation.errors.push(
        "OB3 credential is missing an issuance date",
      );
      result.contentValidation.isValid = false;
    } else {
      try {
        new Date(badge.issuanceDate as string);
      } catch (e) {
        result.contentValidation.errors.push(
          "OB3 credential has an invalid issuance date",
        );
        result.contentValidation.isValid = false;
      }
    }

    // Validate credential subject
    if (!badge.credentialSubject) {
      result.contentValidation.errors.push(
        "OB3 credential is missing a credential subject",
      );
      result.contentValidation.isValid = false;
    } else if (!OB3Guards.isCredentialSubject(badge.credentialSubject)) {
      result.contentValidation.errors.push(
        "OB3 credential has an invalid credential subject structure",
      );
      result.contentValidation.isValid = false;
    } else {
      // Validate credential subject components
      if (!badge.credentialSubject.type) {
        result.contentValidation.errors.push(
          "Credential subject is missing a type",
        );
        result.contentValidation.isValid = false;
      }

      // Validate achievement
      if (!badge.credentialSubject.achievement) {
        result.contentValidation.errors.push(
          "Credential subject is missing an achievement",
        );
        result.contentValidation.isValid = false;
      } else if (
        !OB3Guards.isAchievement(badge.credentialSubject.achievement)
      ) {
        result.contentValidation.errors.push(
          "Credential subject has an invalid achievement structure",
        );
        result.contentValidation.isValid = false;
      } else {
        // Validate achievement components
        if (!badge.credentialSubject.achievement.id) {
          result.contentValidation.errors.push("Achievement is missing an ID");
          result.contentValidation.isValid = false;
        }

        if (!badge.credentialSubject.achievement.type) {
          result.contentValidation.errors.push("Achievement is missing a type");
          result.contentValidation.isValid = false;
        }

        if (!badge.credentialSubject.achievement.name) {
          result.contentValidation.errors.push("Achievement is missing a name");
          result.contentValidation.isValid = false;
        }

        // Validate criteria if present
        if (
          badge.credentialSubject.achievement.criteria &&
          !OB3Guards.isCriteria(badge.credentialSubject.achievement.criteria)
        ) {
          result.contentValidation.errors.push(
            "Achievement has an invalid criteria structure",
          );
          result.contentValidation.isValid = false;
        }

        // Validate image if present
        if (badge.credentialSubject.achievement.image) {
          if (
            typeof badge.credentialSubject.achievement.image === "object" &&
            (!badge.credentialSubject.achievement.image.id ||
              !badge.credentialSubject.achievement.image.type)
          ) {
            result.contentValidation.errors.push(
              "Achievement has an invalid image structure",
            );
            result.contentValidation.isValid = false;
          }
        } else {
          result.contentValidation.warnings.push(
            "Achievement is missing an image",
          );
        }
      }
    }

    // Validate refresh service if present
    if (
      badge.refreshService &&
      !OB3Guards.isRefreshService(badge.refreshService)
    ) {
      result.contentValidation.errors.push(
        "OB3 credential has an invalid refresh service structure",
      );
      result.contentValidation.isValid = false;
    }

    // Validate terms of use if present
    if (badge.termsOfUse) {
      if (Array.isArray(badge.termsOfUse)) {
        for (const terms of badge.termsOfUse) {
          if (!OB3Guards.isTermsOfUse(terms)) {
            result.contentValidation.errors.push(
              "OB3 credential has an invalid terms of use structure",
            );
            result.contentValidation.isValid = false;
            break;
          }
        }
      } else if (!OB3Guards.isTermsOfUse(badge.termsOfUse)) {
        result.contentValidation.errors.push(
          "OB3 credential has an invalid terms of use structure",
        );
        result.contentValidation.isValid = false;
      }
    }

    // Validate evidence if present
    if (badge.evidence) {
      if (Array.isArray(badge.evidence)) {
        for (const evidence of badge.evidence) {
          if (!OB3Guards.isEvidence(evidence)) {
            result.contentValidation.errors.push(
              "OB3 credential has an invalid evidence structure",
            );
            result.contentValidation.isValid = false;
            break;
          }
        }
      } else if (!OB3Guards.isEvidence(badge.evidence)) {
        result.contentValidation.errors.push(
          "OB3 credential has an invalid evidence structure",
        );
        result.contentValidation.isValid = false;
      }
    }
  }

  /**
   * Verifies a hosted badge by checking if it's accessible at its ID URL
   * @param badge The badge to verify
   * @param result The verification result to update
   */
  private static async verifyHostedBadge(
    badge: OB2.Assertion,
    result: VerificationResult,
  ): Promise<void> {
    // For hosted verification, the badge should be accessible at its ID URL
    if (
      !badge.id ||
      typeof badge.id !== "string" ||
      !badge.id.startsWith("http")
    ) {
      result.contentValidation.errors.push(
        "Hosted badge must have an HTTP(S) ID URL",
      );
      result.contentValidation.isValid = false;
      return;
    }

    // In a browser environment, we would fetch the badge from its ID URL
    // and compare it with the current badge
    // For this implementation, we'll simulate this process
    result.contentValidation.warnings.push(
      "Hosted badge verification requires network access to validate against the hosted assertion",
    );

    // In a real implementation, we would:
    // 1. Fetch the badge from its ID URL
    // 2. Compare the fetched badge with the current badge
    // 3. Check if the issuer is authorized to issue this badge

    // For now, we'll assume the badge is valid if it has an HTTP ID
    // This is a simplified implementation
  }

  /**
   * Verifies a signed badge by checking its signature
   * @param badge The badge to verify
   * @param result The verification result to update
   */
  private static async verifySignedBadge(
    badge: OB2.Assertion,
    result: VerificationResult,
  ): Promise<void> {
    // For signed verification, the badge should have a signature that can be verified
    // using the issuer's public key

    // Check if the badge has a creator property in its verification object
    // which points to the key used to sign the badge
    const verification = badge.verification;
    if (
      !verification.creator &&
      typeof badge.badge === "object" &&
      badge.badge.issuer
    ) {
      // If no creator is specified, we need to check the issuer's profile for public keys
      result.contentValidation.warnings.push(
        "Signed badge does not specify which key was used for signing",
      );
    }

    // In a real implementation, we would:
    // 1. Get the public key from the issuer's profile
    // 2. Verify the signature using the public key
    // 3. Check if the issuer is authorized to issue this badge

    // For now, we'll add a warning as full signature verification
    // requires additional libraries and is complex
    result.contentValidation.warnings.push(
      "Full signature verification requires cryptographic libraries",
    );
  }

  /**
   * Checks if a badge has expired
   * @param badge The badge to check
   * @param result The verification result to update
   */
  private static checkExpiration(
    badge: OB2.Assertion | OB3.VerifiableCredential,
    result: VerificationResult,
  ): void {
    // Check if the badge has an expiration date
    const expirationDate = isOB2Assertion(badge)
      ? badge.expires
      : badge.expirationDate;

    if (expirationDate) {
      const expDate = new Date(expirationDate as string);
      const now = new Date();

      if (expDate < now) {
        result.expirationStatus = "expired";
        result.contentValidation.errors.push("Badge has expired");
        result.contentValidation.isValid = false;
      } else {
        result.expirationStatus = "valid";
      }
    } else {
      result.expirationStatus = "not-applicable";
    }
  }

  /**
   * Checks if a badge has been revoked
   * @param badge The badge to check
   * @param result The verification result to update
   */
  private static async checkRevocation(
    badge: OB2.Assertion | OB3.VerifiableCredential,
    result: VerificationResult,
  ): Promise<void> {
    // For OB2 badges, check the revoked property
    if (isOB2Assertion(badge)) {
      if (badge.revoked === true) {
        result.revocationStatus = "revoked";
        result.contentValidation.errors.push(
          badge.revocationReason
            ? `Badge has been revoked: ${badge.revocationReason}`
            : "Badge has been revoked",
        );
        result.contentValidation.isValid = false;
        return;
      }

      // For hosted badges, a 410 Gone response would indicate revocation
      // For signed badges, we would need to check the issuer's revocation list

      // If the badge has an issuer with a revocationList, we should check it
      // This would require network access in a real implementation

      result.revocationStatus = "valid";
      return;
    }

    // For OB3 badges, check the credentialStatus property
    if (badge.credentialStatus) {
      // In a real implementation, we would check the credential status endpoint
      // This would require network access
      result.contentValidation.warnings.push(
        "Credential status checking requires network access",
      );
      result.revocationStatus = "unknown";
    } else {
      // If no credential status is provided, we can't determine revocation status
      result.revocationStatus = "unknown";
      result.contentValidation.warnings.push(
        "Revocation checking for OB3 credentials is not fully implemented",
      );
    }
  }

  /**
   * Normalizes verification type to handle aliases
   * @param type The verification type to normalize
   * @returns Normalized verification type
   */
  private static normalizeVerificationType(type: string): string {
    // Handle aliases defined in the OB2 context
    switch (type.toLowerCase()) {
      case "hosted":
      case "hostedbadge":
        return "hosted";
      case "signed":
      case "signedbadge":
        return "signed";
      default:
        return type;
    }
  }
}
