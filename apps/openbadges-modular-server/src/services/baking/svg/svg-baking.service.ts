/**
 * SVG Baking Service
 *
 * Implements the baking (embedding) and unbaking (extracting) of
 * Open Badges credentials in SVG format.
 *
 * SVG baking embeds the credential JSON in an <openbadges:credential>
 * element within the SVG document, using the Open Badges namespace.
 */

import type { OB2, OB3 } from "openbadges-types";
import { addNamespace, parseSVG, serializeSVG } from "./svg-utils.js";

/**
 * The Open Badges namespace URI used for embedding credentials in SVG
 */
const OPENBADGES_NAMESPACE = "https://purl.imsglobal.org/spec/ob/v3p0";

/**
 * The namespace prefix for Open Badges elements
 */
const OPENBADGES_PREFIX = "openbadges";

/**
 * Embed an Open Badges credential into an SVG image (baking)
 *
 * @param svgContent - The source SVG content as a string
 * @param credential - The Open Badges credential to embed (OB2 Assertion or OB3 VerifiableCredential)
 * @returns The SVG with embedded credential as a string
 * @throws Error if the SVG content is invalid
 */
export function bakeSVG(
  svgContent: string,
  credential: OB2.Assertion | OB3.VerifiableCredential,
): string {
  // Parse the SVG content into a DOM document
  const doc = parseSVG(svgContent);

  // Add the Open Badges namespace to the SVG root element
  addNamespace(doc, OPENBADGES_PREFIX, OPENBADGES_NAMESPACE);

  // Serialize the credential to JSON
  const credentialJSON = JSON.stringify(credential);

  // Create the openbadges:credential element
  const credentialElement = doc.createElementNS(
    OPENBADGES_NAMESPACE,
    `${OPENBADGES_PREFIX}:credential`,
  );

  // Set the credential data as the text content of the element
  credentialElement.textContent = credentialJSON;

  // Append the credential element to the SVG root
  const svgElement = doc.documentElement;
  svgElement.appendChild(credentialElement);

  // Serialize the modified SVG back to a string
  return serializeSVG(doc);
}

/**
 * Extract an Open Badges credential from a baked SVG image (unbaking)
 *
 * @param svgContent - The baked SVG content as a string
 * @returns The extracted credential, or null if no credential is found
 * @throws Error if the SVG content is invalid or the credential JSON is malformed
 */
export function unbakeSVG(
  svgContent: string,
): OB2.Assertion | OB3.VerifiableCredential | null {
  // Parse the SVG content into a DOM document
  const doc = parseSVG(svgContent);

  // Look for the openbadges:credential element
  const credentialElements = doc.getElementsByTagNameNS(
    OPENBADGES_NAMESPACE,
    "credential",
  );

  // If no credential element found, return null
  if (credentialElements.length === 0) {
    return null;
  }

  // Get the first credential element
  const credentialElement = credentialElements[0];

  // Extract the text content (credential JSON)
  const credentialJSON = credentialElement?.textContent;

  if (!credentialJSON) {
    return null;
  }

  // Parse the JSON and return the credential
  try {
    const credential = JSON.parse(credentialJSON);
    return credential as OB2.Assertion | OB3.VerifiableCredential;
  } catch (error) {
    throw new Error(
      `Invalid credential JSON in SVG: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
