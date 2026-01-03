import { DOMParser, XMLSerializer, type Document } from '@xmldom/xmldom';

/**
 * Parse an SVG string into a DOM Document.
 *
 * @param svgContent - The SVG content as a string
 * @returns The parsed DOM Document
 * @throws Error if the SVG content is invalid
 */
export function parseSVG(svgContent: string): Document {
  let hasError = false;

  const parser = new DOMParser({
    onError: () => {
      hasError = true;
    }
  });

  try {
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Check if errors were collected by the error handler
    if (hasError) {
      throw new Error('Invalid SVG content: parsing failed');
    }

    // Also check for parsererror elements (DOM-based errors)
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error('Invalid SVG content: parsing failed');
    }

    return doc;
  } catch (_error) {
    // Re-throw our standardized error message
    throw new Error('Invalid SVG content: parsing failed');
  }
}

/**
 * Serialize a DOM Document back to an SVG string.
 *
 * @param doc - The DOM Document to serialize
 * @returns The serialized SVG string
 */
export function serializeSVG(doc: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Add a namespace to an SVG document's root element.
 *
 * @param doc - The DOM Document
 * @param prefix - The namespace prefix (e.g., 'openbadges')
 * @param uri - The namespace URI (e.g., 'https://purl.imsglobal.org/spec/ob/v3p0')
 */
export function addNamespace(doc: Document, prefix: string, uri: string): void {
  const svgElement = doc.documentElement;

  if (!svgElement || svgElement.tagName !== 'svg') {
    throw new Error('Document does not have a valid SVG root element');
  }

  svgElement.setAttributeNS(
    'http://www.w3.org/2000/xmlns/',
    `xmlns:${prefix}`,
    uri
  );
}
