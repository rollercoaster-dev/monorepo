/**
 * Utility functions for working with Open Badges
 * This file provides helper functions for creating and manipulating badge data
 */

// Import utility functions from shared modules
import { createIRI, createDateTime, isIRI, isDateTime } from "./shared/common";
import {
  isJsonLdObject,
  isJsonLdArray,
  hasJsonLdType,
  hasJsonLdContext,
  OB2Context,
  OB3Context,
  VCContext,
} from "./shared/jsonld";

// Import badge normalization functions
import {
  normalizeBadge,
  normalizeBadges,
  filterBadgesBySearchTerm,
  sortBadges,
  groupBadges,
} from "./badge-normalizer";

// Import validation functions
import { validateBadge } from "./validation";

// Re-export all utility functions
export {
  // IRI and DateTime utilities
  createIRI,
  createDateTime,
  isIRI,
  isDateTime,

  // JSON-LD utilities
  isJsonLdObject,
  isJsonLdArray,
  hasJsonLdType,
  hasJsonLdContext,
  OB2Context,
  OB3Context,
  VCContext,

  // Badge normalization utilities
  normalizeBadge,
  normalizeBadges,
  filterBadgesBySearchTerm,
  sortBadges,
  groupBadges,

  // Validation utilities
  validateBadge,
};
