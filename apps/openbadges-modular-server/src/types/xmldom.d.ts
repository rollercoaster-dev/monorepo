/**
 * Type declarations for @xmldom/xmldom
 *
 * Minimal type definitions for XML DOM parsing used in SVG baking.
 */

declare module "@xmldom/xmldom" {
  export interface DOMParserOptions {
    onError?: (level: string, msg: string) => void;
    locator?: boolean;
    xmlns?: Record<string, string>;
  }

  export class DOMParser {
    constructor(options?: DOMParserOptions);
    parseFromString(source: string, mimeType: string): Document;
  }

  export class XMLSerializer {
    serializeToString(node: Node): string;
  }

  // Re-export DOM types from lib.dom
  export interface Node {
    readonly nodeName: string;
    readonly nodeType: number;
    readonly nodeValue: string | null;
    readonly parentNode: Node | null;
    readonly childNodes: NodeList;
    readonly firstChild: Node | null;
    readonly lastChild: Node | null;
    readonly previousSibling: Node | null;
    readonly nextSibling: Node | null;
    readonly ownerDocument: Document | null;
    textContent: string | null;
    appendChild(node: Node): Node;
    removeChild(node: Node): Node;
    insertBefore(node: Node, child: Node | null): Node;
    replaceChild(newChild: Node, oldChild: Node): Node;
    cloneNode(deep?: boolean): Node;
  }

  export interface NodeList {
    readonly length: number;
    item(index: number): Node | null;
    [index: number]: Node;
  }

  export interface ElementList {
    readonly length: number;
    item(index: number): Element | null;
    [index: number]: Element;
  }

  export interface Element extends Node {
    readonly tagName: string;
    getAttribute(name: string): string | null;
    getAttributeNS(namespace: string | null, localName: string): string | null;
    setAttribute(name: string, value: string): void;
    setAttributeNS(
      namespace: string | null,
      qualifiedName: string,
      value: string,
    ): void;
    removeAttribute(name: string): void;
    getElementsByTagName(name: string): ElementList;
    getElementsByTagNameNS(namespace: string | null, name: string): ElementList;
  }

  export interface Document extends Node {
    readonly documentElement: Element;
    createElement(tagName: string): Element;
    createElementNS(namespace: string | null, qualifiedName: string): Element;
    createTextNode(data: string): Node;
    getElementById(id: string): Element | null;
    getElementsByTagName(name: string): ElementList;
    getElementsByTagNameNS(namespace: string | null, name: string): ElementList;
  }
}
