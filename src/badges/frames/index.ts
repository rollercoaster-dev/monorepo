import type { BadgeFrame } from '../types';
import type { FrameGenerator } from './types';
import { boldBorderGenerator } from './boldBorder';

export { computeFrameParams } from './dataMapper';
export type { ComputeFrameParamsInput } from './dataMapper';
export { useFrameParamsForGoal } from './useFrameParamsForGoal';

export type { FrameGeneratorConfig, FrameGenerator } from './types';
export { boldBorderGenerator } from './boldBorder';

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
  guilloche: unimplemented('guilloche'),
  crossHatch: unimplemented('crossHatch'),
  microprint: unimplemented('microprint'),
  rosette: unimplemented('rosette'),
};
