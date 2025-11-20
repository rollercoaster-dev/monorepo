// src/utils/badge-guards.ts
import type { OB2, Shared } from '@/types';
import { createIRI, createDateTime } from '@/utils/type-helpers';

// Helper function to create type-safe OB3 ImageObject
export function createOB3ImageObject(id: string): Shared.OB3ImageObject {
  return {
    id: createIRI(id),
    type: 'Image',
  };
}

// Helper for test files to ensure string URLs are converted to IRI type
export function ensureIRI(url: string | Shared.IRI): Shared.IRI {
  if (typeof url === 'string') {
    return createIRI(url);
  }
  return url;
}

// Helper for test files to ensure string dates are converted to DateTime type
export function ensureDateTime(dateTime: string | Shared.DateTime): Shared.DateTime {
  if (typeof dateTime === 'string') {
    return createDateTime(dateTime);
  }
  return dateTime;
}

// Helper to ensure string or IRI for image
export function ensureImage(image: string | Shared.IRI | OB2.Image): Shared.IRI | OB2.Image {
  if (typeof image === 'string') {
    return createIRI(image);
  }
  return image;
}

// Helper to ensure string or IRI for achievement image
export function ensureAchievementImage(
  image: string | Shared.IRI | Shared.OB3ImageObject | undefined
): Shared.IRI | Shared.OB3ImageObject | undefined {
  if (typeof image === 'string') {
    return createIRI(image);
  }
  return image;
}

// Export a dummy value to make the module recognized
export const __moduleMarker = true;
