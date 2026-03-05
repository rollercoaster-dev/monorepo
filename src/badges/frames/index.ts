import type { BadgeFrame } from '../types';
import type { FrameGenerator } from './types';
import { boldBorderGenerator } from './boldBorder';
import { crossHatchGenerator } from './crossHatch';
import { guillocheGenerator } from './guilloche';
import { rosetteGenerator } from './rosette';

export { computeFrameParams } from './dataMapper';
export type { ComputeFrameParamsInput } from './dataMapper';
export { useFrameParamsForGoal } from './useFrameParamsForGoal';

export type { FrameGeneratorConfig, FrameGenerator } from './types';
export { DEFAULT_STROKE_COLOR, clamp } from './constants';
export { boldBorderGenerator } from './boldBorder';
export { crossHatchGenerator } from './crossHatch';
export { guillocheGenerator } from './guilloche';
export { rosetteGenerator } from './rosette';

/** Placeholder for frame types not yet implemented */
const unimplemented =
  (name: string): FrameGenerator =>
  () => {
    if (__DEV__) {
      console.warn(`[frameRegistry] Frame "${name}" is not yet implemented.`);
    }
    return null;
  };

/** Registry mapping each BadgeFrame to its generator */
export const frameRegistry: Record<BadgeFrame, FrameGenerator> = {
  none: () => null,
  boldBorder: boldBorderGenerator,
  guilloche: guillocheGenerator,
  crossHatch: crossHatchGenerator,
  microprint: unimplemented('microprint'),
  rosette: rosetteGenerator,
};
