/**
 * High-level credential building API
 *
 * @module credentials/credential-builder
 */

import { BadgeSerializerFactory } from "./serializer.js";
import { BadgeVersion } from "./version.js";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
  VerifiableCredentialData,
} from "./types.js";

export interface CredentialOptions {
  assertion: AssertionData;
  badgeClass: BadgeClassData;
  issuer: IssuerData;
  version?: BadgeVersion;
}

/**
 * Builds an Open Badges credential from component data.
 * Defaults to OB3 (VerifiableCredential) format.
 */
export function buildCredential(
  options: CredentialOptions,
):
  | (AssertionData & { "@context": string | string[]; type: string | string[] })
  | VerifiableCredentialData {
  const version = options.version ?? BadgeVersion.V3;
  const serializer = BadgeSerializerFactory.createSerializer(version);
  return serializer.serializeAssertion(
    options.assertion,
    options.badgeClass,
    options.issuer,
  );
}

/**
 * Serializes data directly to OB3 VerifiableCredential format.
 */
export function serializeOB3(
  assertion: AssertionData,
  badgeClass: BadgeClassData,
  issuer: IssuerData,
): VerifiableCredentialData {
  const serializer = BadgeSerializerFactory.createSerializer(BadgeVersion.V3);
  return serializer.serializeAssertion(
    assertion,
    badgeClass,
    issuer,
  ) as VerifiableCredentialData;
}
