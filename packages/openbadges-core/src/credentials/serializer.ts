/**
 * Version-specific serializers for Open Badges
 *
 * Provides serializers for converting badge data to OB 2.0 and OB 3.0 formats.
 * Uses a factory pattern for clean version-specific logic separation.
 *
 * @module credentials/serializer
 */

import {
  BadgeVersion,
  BADGE_VERSION_CONTEXTS,
  VC_V2_CONTEXT_URL,
} from "./version.js";
import type { Shared } from "openbadges-types";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
  VerifiableCredentialData,
} from "./types.js";

/**
 * Base serializer interface for Open Badges
 */
export interface BadgeSerializer {
  serializeIssuer(
    issuer: IssuerData,
  ): IssuerData & { "@context": string | string[]; type: string | string[] };

  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & {
    "@context": string | string[];
    type: string | string[];
  };

  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData,
    issuer?: IssuerData,
  ):
    | (AssertionData & {
        "@context": string | string[];
        type: string | string[];
      })
    | VerifiableCredentialData;

  getVersion(): BadgeVersion;
}

/**
 * Serializer for Open Badges 2.0
 */
export class OpenBadges2Serializer implements BadgeSerializer {
  serializeIssuer(
    issuer: IssuerData,
  ): IssuerData & { "@context": string | string[]; type: string | string[] } {
    const result: Record<string, unknown> = {
      "@context": BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: issuer.id,
      type: "Issuer",
      name: issuer.name,
      url: issuer.url,
    };
    if (issuer.email) result.email = issuer.email;
    if (issuer.description) result.description = issuer.description;
    if (issuer.image) result.image = issuer.image;
    if (issuer.publicKey) result.publicKey = issuer.publicKey;

    return result as IssuerData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & {
    "@context": string | string[];
    type: string | string[];
  } {
    const result: Record<string, unknown> = {
      "@context": BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: badgeClass.id,
      type: "BadgeClass",
      name: badgeClass.name,
      description: badgeClass.description,
      image: badgeClass.image,
      criteria: badgeClass.criteria,
      issuer: badgeClass.issuer,
    };
    if (badgeClass.alignment) result.alignment = badgeClass.alignment;
    if (badgeClass.tags) result.tags = badgeClass.tags;

    return result as BadgeClassData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData,
    _issuer?: IssuerData,
  ):
    | (AssertionData & {
        "@context": string | string[];
        type: string | string[];
      })
    | VerifiableCredentialData {
    const verification = assertion.verification || {
      type: "hosted",
      ...(assertion.id ? { verificationProperty: assertion.id } : {}),
    };

    const result: Record<string, unknown> = {
      "@context": BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: assertion.id,
      type: "Assertion",
      recipient: assertion.recipient,
      badgeClass: (assertion.badgeClass || badgeClass?.id) as Shared.IRI,
      verification: verification,
      issuedOn: assertion.issuedOn,
    };
    if (assertion.expires) result.expires = assertion.expires;
    if (assertion.evidence) result.evidence = assertion.evidence;
    if (assertion.revoked !== undefined) result.revoked = assertion.revoked;
    if (assertion.revocationReason)
      result.revocationReason = assertion.revocationReason;

    return result as AssertionData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  getVersion(): BadgeVersion {
    return BadgeVersion.V2;
  }
}

function getV3Contexts(): string[] {
  return Array.isArray(BADGE_VERSION_CONTEXTS[BadgeVersion.V3])
    ? BADGE_VERSION_CONTEXTS[BadgeVersion.V3]
    : [BADGE_VERSION_CONTEXTS[BadgeVersion.V3], VC_V2_CONTEXT_URL];
}

/**
 * Serializer for Open Badges 3.0
 */
export class OpenBadges3Serializer implements BadgeSerializer {
  serializeIssuer(
    issuer: IssuerData,
  ): IssuerData & { "@context": string | string[]; type: string | string[] } {
    const result: Record<string, unknown> = {
      "@context": getV3Contexts(),
      id: issuer.id,
      type: ["Profile"],
      name: issuer.name,
      url: issuer.url,
    };
    if (issuer.email) result.email = issuer.email;
    if (issuer.description) result.description = issuer.description;
    if (issuer.image) result.image = issuer.image;
    if (issuer.publicKey) result.publicKey = issuer.publicKey;
    if (issuer.telephone) result.telephone = issuer.telephone;
    if (issuer.did) result.did = issuer.did;

    return result as IssuerData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & {
    "@context": string | string[];
    type: string | string[];
  } {
    const result: Record<string, unknown> = {
      "@context": getV3Contexts(),
      id: badgeClass.id,
      type: ["Achievement"],
      issuer: badgeClass.issuer,
      name: badgeClass.name,
      description: badgeClass.description,
      image: badgeClass.image,
      criteria: badgeClass.criteria,
    };
    if (badgeClass.alignment) result.alignments = badgeClass.alignment;
    if (badgeClass.tags) result.tags = badgeClass.tags;
    if (badgeClass.achievementType)
      result.achievementType = badgeClass.achievementType;
    if (badgeClass.creator) result.creator = badgeClass.creator;
    if (badgeClass.resultDescriptions)
      result.resultDescriptions = badgeClass.resultDescriptions;
    if (badgeClass.version) result.version = badgeClass.version;
    if (badgeClass.related) result.related = badgeClass.related;
    if (badgeClass.endorsement) result.endorsement = badgeClass.endorsement;

    return result as BadgeClassData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData,
    issuer?: IssuerData,
  ):
    | (AssertionData & {
        "@context": string | string[];
        type: string | string[];
      })
    | VerifiableCredentialData {
    if (badgeClass && issuer) {
      return this.createVerifiableCredential(assertion, badgeClass, issuer);
    }

    const result: Record<string, unknown> = {
      "@context": getV3Contexts(),
      id: assertion.id,
      type: ["Assertion"],
      badgeClass: (assertion.badgeClass || badgeClass?.id) as Shared.IRI,
      recipient: assertion.recipient,
      issuedOn: assertion.issuedOn,
    };
    if (assertion.expires) result.expires = assertion.expires;
    if (assertion.evidence) result.evidence = assertion.evidence;
    if (assertion.verification) result.verification = assertion.verification;
    if (assertion.revoked !== undefined) result.revoked = assertion.revoked;
    if (assertion.revocationReason)
      result.revocationReason = assertion.revocationReason;
    if (assertion.credentialStatus)
      result.credentialStatus = assertion.credentialStatus;

    return result as AssertionData & {
      "@context": string | string[];
      type: string | string[];
    };
  }

  private createVerifiableCredential(
    assertion: AssertionData,
    badgeClass: BadgeClassData,
    issuer: IssuerData,
  ): VerifiableCredentialData {
    const contextList = Array.isArray(BADGE_VERSION_CONTEXTS[BadgeVersion.V3])
      ? BADGE_VERSION_CONTEXTS[BadgeVersion.V3]
      : [BADGE_VERSION_CONTEXTS[BadgeVersion.V3]];

    // Build issuer object (OB3 Section 8.4: type MUST include "Profile")
    const issuerObj: Record<string, unknown> = {
      id: issuer.id,
      type: ["Profile"],
      name: issuer.name,
      url: issuer.url,
    };
    if (issuer.email) issuerObj.email = issuer.email;
    if (issuer.description) issuerObj.description = issuer.description;
    if (issuer.image) issuerObj.image = issuer.image;
    if (issuer.telephone) issuerObj.telephone = issuer.telephone;

    // Build achievement object
    const achievement: Record<string, unknown> = {
      id: badgeClass.id,
      type: ["Achievement"],
      name: badgeClass.name,
      description: badgeClass.description,
      image: badgeClass.image,
      criteria: badgeClass.criteria,
      issuer: issuer.id,
    };
    if (badgeClass.alignment) achievement.alignments = badgeClass.alignment;
    if (badgeClass.tags) achievement.tags = badgeClass.tags;
    if (badgeClass.achievementType)
      achievement.achievementType = badgeClass.achievementType;
    if (badgeClass.creator) achievement.creator = badgeClass.creator;
    if (badgeClass.resultDescriptions)
      achievement.resultDescriptions = badgeClass.resultDescriptions;

    // BADGE_VERSION_CONTEXTS[V3] already has correct order: VC 2.0 first, OB3 second
    // Per VC Data Model 2.0 spec: https://www.w3.org/TR/vc-data-model-2.0/#contexts
    const result: Record<string, unknown> = {
      "@context": contextList,
      id: assertion.id,
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: issuerObj,
      validFrom: assertion.issuedOn,
      credentialSubject: {
        id: assertion.recipient.identity,
        type: ["AchievementSubject"],
        achievement,
      },
    };
    if (assertion.expires) result.validUntil = assertion.expires;
    if (assertion.evidence) result.evidence = assertion.evidence;
    if (assertion.verification) {
      result.proof = {
        type: assertion.verification.type,
        created: assertion.verification.created,
        verificationMethod: assertion.verification.creator,
        proofPurpose: "assertionMethod",
        proofValue: assertion.verification.signatureValue,
      };
    }
    if (assertion.credentialStatus)
      result.credentialStatus = assertion.credentialStatus;

    return result as unknown as VerifiableCredentialData;
  }

  getVersion(): BadgeVersion {
    return BadgeVersion.V3;
  }
}

/**
 * Factory for creating badge serializers
 */
export class BadgeSerializerFactory {
  static createSerializer(version: BadgeVersion): BadgeSerializer {
    switch (version) {
      case BadgeVersion.V2:
        return new OpenBadges2Serializer();
      case BadgeVersion.V3:
        return new OpenBadges3Serializer();
      default:
        throw new Error(`Unsupported badge version: ${version}`);
    }
  }
}
