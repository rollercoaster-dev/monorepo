/**
 * Design tokens — re-exported from design-tokens adapter
 */

import {
  space as _space,
  size as _size,
  sizeL as _sizeL,
  radius as _radius,
  zIndex as _zIndex,
  fontWeight as _fontWeight,
  lineHeight as _lineHeight,
  lineHeightL as _lineHeightL,
} from './adapter';

export const space = _space;
export const size = _size;
export const sizeL = _sizeL;
export const radius = _radius;
export const zIndex = _zIndex;
export const fontWeight = _fontWeight;
export const lineHeight = _lineHeight;
export const lineHeightL = _lineHeightL;

export type Space = typeof space;
export type Size = typeof size;
export type SizeL = typeof sizeL;
export type Radius = typeof radius;
export type ZIndex = typeof zIndex;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
export type LineHeightL = typeof lineHeightL;
