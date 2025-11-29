/**
 * Direct Type Guards Examples for Open Badges Types
 *
 * This file demonstrates how to use the direct type guards provided by the Open Badges Types package
 * for runtime validation of badge data.
 */

import {
  isOB2Assertion,
  isOB2BadgeClass,
  isOB2Profile,
  isOB3VerifiableCredential,
  isOB3Achievement,
  isOB3Issuer,
  isJsonLdObject,
  hasJsonLdType,
  hasJsonLdContext,
  isIRI,
  isDateTime,
  isBadge,
} from "../src";

import { createOB2Example, createOB3Example } from "./basic-usage";

/**
 * Example: Using Direct Type Guards
 */
function directTypeGuardsExample() {
  // Create sample badges
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  console.log("=== Badge Type Checks ===");
  console.log("OB2 Badge is an OB2 Assertion:", isOB2Assertion(ob2Badge));
  console.log(
    "OB3 Badge is an OB3 VerifiableCredential:",
    isOB3VerifiableCredential(ob3Badge),
  );
  console.log("OB2 Badge is a Badge (either version):", isBadge(ob2Badge));
  console.log("OB3 Badge is a Badge (either version):", isBadge(ob3Badge));

  // Extract and check BadgeClass
  const badgeClass = typeof ob2Badge.badge === "object" ? ob2Badge.badge : null;
  if (badgeClass) {
    console.log("\n=== BadgeClass Checks ===");
    console.log(
      "BadgeClass is an OB2 BadgeClass:",
      isOB2BadgeClass(badgeClass),
    );

    // Extract and check Issuer
    const issuer =
      typeof badgeClass.issuer === "object" ? badgeClass.issuer : null;
    if (issuer) {
      console.log("Issuer is an OB2 Profile:", isOB2Profile(issuer));
    }
  }

  // Extract and check OB3 Achievement
  const achievement = ob3Badge.credentialSubject.achievement;
  const singleAchievement = Array.isArray(achievement)
    ? achievement[0]
    : achievement;

  console.log("\n=== Achievement Checks ===");
  console.log(
    "Achievement is an OB3 Achievement:",
    isOB3Achievement(singleAchievement),
  );

  // Extract and check OB3 Issuer
  const ob3Issuer =
    typeof ob3Badge.issuer === "object" ? ob3Badge.issuer : null;
  if (ob3Issuer) {
    console.log("Issuer is an OB3 Issuer:", isOB3Issuer(ob3Issuer));
  }

  // Check IRI and DateTime values
  console.log("\n=== IRI and DateTime Checks ===");
  console.log("Valid IRI check:", isIRI("https://example.org/badges/123"));
  console.log("Invalid IRI check:", isIRI("not a url"));
  console.log("Valid DateTime check:", isDateTime("2023-06-15T12:00:00Z"));
  console.log("Invalid DateTime check:", isDateTime("2023-06-15"));

  // Check JSON-LD properties
  console.log("\n=== JSON-LD Checks ===");
  console.log("OB2 Badge is a JSON-LD object:", isJsonLdObject(ob2Badge));
  console.log(
    "OB2 Badge has Assertion type:",
    hasJsonLdType(ob2Badge, "Assertion"),
  );
  console.log(
    "OB2 Badge has OB2 context:",
    hasJsonLdContext(ob2Badge, "https://w3id.org/openbadges/v2"),
  );
}

// Run the example
directTypeGuardsExample();

// Export the example for use in other files
export { directTypeGuardsExample };
