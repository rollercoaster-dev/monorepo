/**
 * Utility Functions Examples for Open Badges Types
 *
 * This file demonstrates how to use the utility functions provided by the Open Badges Types package
 * for working with badge data.
 */

import {
  createIRI,
  createDateTime,
  isIRI,
  isDateTime,
  isJsonLdObject,
  hasJsonLdType,
  hasJsonLdContext,
  OB2Context,
  OB3Context,
  VCContext,
  normalizeBadge,
  normalizeBadges,
  filterBadgesBySearchTerm,
  sortBadges,
  groupBadges,
  validateBadge,
} from "../src";

import { createOB2Example, createOB3Example } from "./basic-usage";

/**
 * Example: Using IRI and DateTime Utilities
 */
function iriAndDateTimeExample() {
  console.log("=== IRI and DateTime Utilities ===");

  // Create branded types
  const iri = createIRI("https://example.org/badges/123");
  const dateTime = createDateTime("2023-06-15T12:00:00Z");

  console.log("Created IRI:", iri);
  console.log("Created DateTime:", dateTime);

  // Validate IRIs and DateTimes
  console.log("Is valid IRI?", isIRI("https://example.org/badges/123"));
  console.log("Is invalid IRI?", isIRI("not a url"));

  console.log("Is valid DateTime?", isDateTime("2023-06-15T12:00:00Z"));
  console.log("Is invalid DateTime?", isDateTime("2023-06-15"));
}

/**
 * Example: Using JSON-LD Utilities
 */
function jsonLdUtilitiesExample() {
  console.log("\n=== JSON-LD Utilities ===");

  // Create sample badges
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  // Check if objects are valid JSON-LD
  console.log("OB2 Badge is JSON-LD?", isJsonLdObject(ob2Badge));
  console.log("OB3 Badge is JSON-LD?", isJsonLdObject(ob3Badge));
  console.log("Empty object is JSON-LD?", isJsonLdObject({}));

  // Check JSON-LD types
  console.log(
    "OB2 Badge has Assertion type?",
    hasJsonLdType(ob2Badge, "Assertion"),
  );
  console.log(
    "OB3 Badge has VerifiableCredential type?",
    hasJsonLdType(ob3Badge, "VerifiableCredential"),
  );

  // Check JSON-LD contexts
  console.log(
    "OB2 Badge has OB2 context?",
    hasJsonLdContext(ob2Badge, OB2Context),
  );
  console.log(
    "OB3 Badge has VC context?",
    hasJsonLdContext(ob3Badge, VCContext),
  );
  console.log(
    "OB3 Badge has OB3 context?",
    hasJsonLdContext(ob3Badge, OB3Context),
  );
}

/**
 * Example: Using Badge Normalization Utilities
 */
function badgeNormalizationExample() {
  console.log("\n=== Badge Normalization Utilities ===");

  // Create sample badges
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  // Normalize a single badge
  const normalizedOB2Badge = normalizeBadge(ob2Badge);
  console.log("Normalized OB2 Badge:", {
    id: normalizedOB2Badge.id,
    type: normalizedOB2Badge.type,
    name: normalizedOB2Badge.name,
    issuerName: normalizedOB2Badge.issuerName,
    issuanceDate: normalizedOB2Badge.issuanceDate,
  });

  // Normalize multiple badges
  const normalizedBadges = normalizeBadges([ob2Badge, ob3Badge]);
  console.log("Normalized Badges Count:", normalizedBadges.length);

  // Filter badges by search term
  const filteredBadges = filterBadgesBySearchTerm(normalizedBadges, "Example");
  console.log("Filtered Badges Count:", filteredBadges.length);

  // Sort badges by name
  const sortedBadges = sortBadges(normalizedBadges, "name", "asc");
  console.log(
    "Sorted Badge Names:",
    sortedBadges.map((badge) => badge.name),
  );

  // Group badges by type
  const groupedBadges = groupBadges(normalizedBadges, "type");
  console.log("Grouped Badges:", {
    OB2: groupedBadges.OB2 ? groupedBadges.OB2.length : 0,
    OB3: groupedBadges.OB3 ? groupedBadges.OB3.length : 0,
  });
}

/**
 * Example: Using Validation Utilities
 */
function validationExample() {
  console.log("\n=== Validation Utilities ===");

  // Create sample badges
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  // Validate OB2 badge
  const ob2ValidationResult = validateBadge(ob2Badge);
  console.log("OB2 Badge Validation:", {
    isValid: ob2ValidationResult.isValid,
    version: ob2ValidationResult.version,
    errors: ob2ValidationResult.errors.length,
    warnings: ob2ValidationResult.warnings.length,
  });

  // Validate OB3 badge
  const ob3ValidationResult = validateBadge(ob3Badge);
  console.log("OB3 Badge Validation:", {
    isValid: ob3ValidationResult.isValid,
    version: ob3ValidationResult.version,
    errors: ob3ValidationResult.errors.length,
    warnings: ob3ValidationResult.warnings.length,
  });

  // Validate invalid badge
  const invalidBadge = { type: "InvalidBadge" };
  const invalidValidationResult = validateBadge(invalidBadge);
  console.log("Invalid Badge Validation:", {
    isValid: invalidValidationResult.isValid,
    version: invalidValidationResult.version,
    errors: invalidValidationResult.errors.length,
    warnings: invalidValidationResult.warnings.length,
  });
}

// Run all examples
function runAllExamples() {
  iriAndDateTimeExample();
  jsonLdUtilitiesExample();
  badgeNormalizationExample();
  validationExample();
}

// Run the examples
runAllExamples();

// Export the examples for use in other files
export {
  iriAndDateTimeExample,
  jsonLdUtilitiesExample,
  badgeNormalizationExample,
  validationExample,
  runAllExamples,
};
