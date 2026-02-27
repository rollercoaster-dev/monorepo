export { buildUnsignedCredential, buildDid } from './credentialBuilder';
export type { GoalData, EvidenceRow, CredentialInput } from './credentialBuilder';

export { bakePNG, unbakePNG, isPNG } from './png-baking';
export { generateBadgeImagePNG, DEFAULT_BADGE_COLOR } from './badgeImageGenerator';
export { saveBadgePNG } from './badgeStorage';

export {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  createDefaultBadgeDesign,
  isValidHexColor,
  parseBadgeDesign,
} from './types';
export type { BadgeDesign } from './types';
