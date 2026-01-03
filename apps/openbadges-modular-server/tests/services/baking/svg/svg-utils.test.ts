import { describe, expect, it } from 'bun:test';
import { parseSVG, serializeSVG, addNamespace } from '@/services/baking/svg/svg-utils';

describe('SVG Utilities', () => {
  describe('parseSVG', () => {
    it('should parse valid SVG content', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      const doc = parseSVG(svgContent);

      expect(doc).toBeDefined();
      expect(doc.documentElement.tagName).toBe('svg');
    });

    it('should throw error for invalid SVG content', () => {
      const invalidSvg = '<svg><unclosed-tag></svg>';

      expect(() => parseSVG(invalidSvg)).toThrow('Invalid SVG content: parsing failed');
    });

    it('should parse SVG with attributes', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"></svg>';
      const doc = parseSVG(svgContent);

      const svgElement = doc.documentElement;
      expect(svgElement.getAttribute('width')).toBe('200');
      expect(svgElement.getAttribute('height')).toBe('200');
      expect(svgElement.getAttribute('viewBox')).toBe('0 0 200 200');
    });

    it('should parse SVG with nested elements', () => {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <g id="group1">
            <circle cx="50" cy="50" r="40"/>
            <text x="50" y="50">Test</text>
          </g>
        </svg>
      `;
      const doc = parseSVG(svgContent);

      const groups = doc.getElementsByTagName('g');
      expect(groups.length).toBe(1);
      expect(groups[0].getAttribute('id')).toBe('group1');

      const circles = doc.getElementsByTagName('circle');
      expect(circles.length).toBe(1);
    });
  });

  describe('serializeSVG', () => {
    it('should serialize document to SVG string', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      const doc = parseSVG(svgContent);
      const serialized = serializeSVG(doc);

      expect(serialized).toContain('<svg');
      expect(serialized).toContain('<rect');
      expect(serialized).toContain('width="100"');
      expect(serialized).toContain('height="100"');
    });

    it('should preserve attributes during round-trip', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"></svg>';
      const doc = parseSVG(svgContent);
      const serialized = serializeSVG(doc);

      expect(serialized).toContain('width="300"');
      expect(serialized).toContain('height="300"');
    });

    it('should preserve nested elements during round-trip', () => {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <g>
            <circle cx="50" cy="50" r="40"/>
          </g>
        </svg>
      `;
      const doc = parseSVG(svgContent);
      const serialized = serializeSVG(doc);

      expect(serialized).toContain('<g>');
      expect(serialized).toContain('<circle');
      expect(serialized).toContain('cx="50"');
    });
  });

  describe('addNamespace', () => {
    it('should add namespace to SVG element', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const doc = parseSVG(svgContent);

      addNamespace(doc, 'openbadges', 'https://purl.imsglobal.org/spec/ob/v3p0');

      const svgElement = doc.documentElement;
      const nsAttr = svgElement.getAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'openbadges'
      );
      expect(nsAttr).toBe('https://purl.imsglobal.org/spec/ob/v3p0');
    });

    it('should throw error if document has no SVG root element', () => {
      const xmlContent = '<root><child/></root>';
      const doc = parseSVG(xmlContent);

      expect(() => addNamespace(doc, 'test', 'http://test.com')).toThrow(
        'Document does not have a valid SVG root element'
      );
    });

    it('should preserve existing namespaces when adding new one', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>';
      const doc = parseSVG(svgContent);

      addNamespace(doc, 'openbadges', 'https://purl.imsglobal.org/spec/ob/v3p0');

      const svgElement = doc.documentElement;
      const xlinkNs = svgElement.getAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'xlink'
      );
      const obNs = svgElement.getAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'openbadges'
      );

      expect(xlinkNs).toBe('http://www.w3.org/1999/xlink');
      expect(obNs).toBe('https://purl.imsglobal.org/spec/ob/v3p0');
    });

    it('should allow adding multiple namespaces', () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const doc = parseSVG(svgContent);

      addNamespace(doc, 'openbadges', 'https://purl.imsglobal.org/spec/ob/v3p0');
      addNamespace(doc, 'custom', 'http://example.com/custom');

      const svgElement = doc.documentElement;
      const obNs = svgElement.getAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'openbadges'
      );
      const customNs = svgElement.getAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        'custom'
      );

      expect(obNs).toBe('https://purl.imsglobal.org/spec/ob/v3p0');
      expect(customNs).toBe('http://example.com/custom');
    });
  });
});
