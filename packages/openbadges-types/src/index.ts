// Main entry point for the Open Badges Types package
// Exports all types and runtime helpers/guards from v2, v3, and shared modules

import * as Shared from "./shared/index";
import * as OB2 from "./v2/index";
import * as OB3 from "./v3/index";
import * as CompositeGuards from "./composite-guards";
import * as BadgeNormalizer from "./badge-normalizer";
import { type Badge } from "./composite-guards";

export { Shared, OB2, OB3, CompositeGuards, BadgeNormalizer };
export type { Badge };
export * from "./validation";
export * from "./validation-report";
export * from "./validateWithSchema";
export * from "./type-guards";
export * from "./utils";

// Top-level type re-exports.
//
// Without these, downstream Vue consumers using `OB2.Assertion` /
// `OB3.VerifiableCredential` etc. through this package's namespace exports
// fail vue-tsc declaration emit with TS4023 ("has or is using name 'X' but
// cannot be named") — vue-tsc cannot find a top-level identifier to print.
// OB3 wins for names shared between versions (Profile is OB3.Profile here);
// OB2 forms remain accessible via `OB2.Profile`.
export type {
  Assertion,
  BadgeClass,
  RevocationList,
  CryptographicKey,
} from "./v2/index";

export type {
  Achievement,
  VerifiableCredential,
  Issuer,
  Profile,
} from "./v3/index";

// Type to determine which Open Badges version to use

export enum OpenBadgesVersion {
  V2 = "2.0",

  V3 = "3.0",
}

// Import types directly to avoid circular references
import type { Assertion as OB2Assertion } from "./v2/index";
import type { VerifiableCredential as OB3VerifiableCredential } from "./v3/index";

// Helper type for version-specific badge operations
export type VersionedBadge<T extends OpenBadgesVersion> =
  T extends OpenBadgesVersion.V2
    ? OB2Assertion
    : T extends OpenBadgesVersion.V3
      ? OB3VerifiableCredential
      : never;
