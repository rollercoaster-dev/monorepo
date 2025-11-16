// Main entry point for the Open Badges Types package
// Exports all types and runtime helpers/guards from v2, v3, and shared modules

import * as Shared from './shared/index';
import * as OB2 from './v2/index';
import * as OB3 from './v3/index';
import * as CompositeGuards from './composite-guards';
import * as BadgeNormalizer from './badge-normalizer';
import { Badge } from './composite-guards';

export { Shared, OB2, OB3, CompositeGuards, BadgeNormalizer, Badge };
export * from './validation';
export * from './type-guards';
export * from './utils';

// Type to determine which Open Badges version to use

export enum OpenBadgesVersion {
  V2 = '2.0',

  V3 = '3.0',
}

// Import types directly to avoid circular references
import { Assertion as OB2Assertion } from './v2/index';
import { VerifiableCredential as OB3VerifiableCredential } from './v3/index';

// Helper type for version-specific badge operations
export type VersionedBadge<T extends OpenBadgesVersion> = T extends OpenBadgesVersion.V2
  ? OB2Assertion
  : T extends OpenBadgesVersion.V3
    ? OB3VerifiableCredential
    : never;
