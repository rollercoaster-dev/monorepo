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
