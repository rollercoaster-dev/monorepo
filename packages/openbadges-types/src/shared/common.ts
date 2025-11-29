// Shared types for both Open Badges 2.0 and 3.0

/**
 * Branded type for IRI (Internationalized Resource Identifier)
 * This provides nominal typing for strings that should be valid IRIs
 */
export type IRI = string & { readonly __brand: unique symbol };

/**
 * Branded type for DateTime in ISO 8601 format
 * This provides nominal typing for strings that should be valid ISO 8601 dates
 */
export type DateTime = string & { readonly __brand: unique symbol };

// For backward compatibility, provide type aliases for the original types
export type IRIString = string;
export type DateTimeString = string;

// Helper functions to create branded types

/**
 * Creates a branded IRI from a string
 * @param value The string value to convert to an IRI
 * @returns The branded IRI
 */
export function createIRI(value: string): IRI {
  return value as IRI;
}

/**
 * Creates a branded DateTime from a string
 * @param value The string value to convert to a DateTime
 * @returns The branded DateTime
 */
export function createDateTime(value: string): DateTime {
  return value as DateTime;
}

// Type guards

/**
 * Type guard to check if a value is a valid IRI
 * @param value The value to check
 * @returns True if the value is a valid IRI, false otherwise
 */
export function isIRI(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    // Basic URL validation
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a valid DateTime in ISO 8601 format
 * @param value The value to check
 * @returns True if the value is a valid DateTime, false otherwise
 */
export function isDateTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  // ISO 8601 regex pattern
  const iso8601Pattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  return iso8601Pattern.test(value);
}

export type JsonLdContext = string | string[] | Record<string, unknown>;
export type LanguageMap = Record<string, string>;
export type MarkdownText = string;

// Common utility type for multi-language support
export interface MultiLanguageString {
  [language: string]: string;
}

// Common image type
export interface ImageObject {
  id?: IRI;
  type?: string;
  caption?: string | MultiLanguageString;
  author?: string;
}

/**
 * Strict image object for Open Badges 3.0 Profile compliance
 * Requires id and type: 'Image'
 */
export interface OB3ImageObject {
  id: IRI;
  type: "Image";
  caption?: string | MultiLanguageString;
  author?: string;
}
