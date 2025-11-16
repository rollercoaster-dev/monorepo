import { OB2 } from './index';
import * as CompositeGuards from './composite-guards';

/**
 * Interface for a normalized badge that works with both OB2 and OB3
 */
export interface NormalizedBadge {
  id: string;
  type: 'OB2' | 'OB3';
  name: string;
  description: string | null;
  imageUrl: string | null;
  issuerName: string | null;
  issuerId: string | null;
  issuanceDate: string;
  expirationDate: string | null;
  isExpired: boolean;
  recipientId: string | null;
  criteria: string | null;
  evidence: string | null;
  rawBadge: CompositeGuards.Badge;
}

/**
 * Normalizes a badge to a common format, regardless of whether it's OB2 or OB3
 * @param badge The badge to normalize
 * @returns A normalized badge object
 * @throws Error if the badge is not a valid OB2 or OB3 badge
 */
export function normalizeBadge(badge: unknown): NormalizedBadge {
  if (!CompositeGuards.isBadge(badge)) {
    throw new Error('Invalid badge format');
  }

  const badgeId = OB2.isAssertion(badge) ? badge.id : badge.id;
  const badgeType = OB2.isAssertion(badge) ? 'OB2' : 'OB3';
  const badgeName = CompositeGuards.getBadgeName(badge) || 'Unnamed Badge';
  const badgeDescription = CompositeGuards.getBadgeDescription(badge);
  const badgeImageUrl = CompositeGuards.getBadgeImageUrl(badge);
  const badgeIssuerName = CompositeGuards.getBadgeIssuerName(badge);
  const badgeIssuer = CompositeGuards.getBadgeIssuer(badge);
  const badgeIssuerId = badgeIssuer ? badgeIssuer.id : null;
  const badgeIssuanceDate = CompositeGuards.getBadgeIssuanceDate(badge) || '';
  const badgeExpirationDate = CompositeGuards.getBadgeExpirationDate(badge);
  const badgeIsExpired = CompositeGuards.isBadgeExpired(badge);
  const badgeRecipientId = CompositeGuards.getBadgeRecipientIdentity(badge);
  const badgeCriteriaNarrative = CompositeGuards.getBadgeCriteriaNarrative(badge);
  const badgeEvidence = CompositeGuards.getBadgeEvidence(badge);
  const badgeEvidenceId =
    badgeEvidence && 'id' in badgeEvidence && badgeEvidence.id ? String(badgeEvidence.id) : null;

  return {
    id: badgeId,
    type: badgeType,
    name: badgeName,
    description: badgeDescription,
    imageUrl: badgeImageUrl,
    issuerName: badgeIssuerName,
    issuerId: badgeIssuerId,
    issuanceDate: badgeIssuanceDate,
    expirationDate: badgeExpirationDate,
    isExpired: badgeIsExpired,
    recipientId: badgeRecipientId,
    criteria: badgeCriteriaNarrative,
    evidence: badgeEvidenceId,
    rawBadge: badge,
  };
}

/**
 * Normalizes an array of badges to a common format
 * @param badges The badges to normalize
 * @returns An array of normalized badge objects
 */
export function normalizeBadges(badges: unknown[]): NormalizedBadge[] {
  const normalizedBadges: NormalizedBadge[] = [];

  for (const badge of badges) {
    try {
      const normalizedBadge = normalizeBadge(badge);
      normalizedBadges.push(normalizedBadge);
    } catch {
      // Skip invalid badges silently
    }
  }

  return normalizedBadges;
}

/**
 * Sorts normalized badges by a specific field
 * @param badges The badges to sort
 * @param field The field to sort by
 * @param direction The sort direction ('asc' or 'desc')
 * @returns The sorted badges
 */
export function sortBadges(
  badges: NormalizedBadge[],
  field: keyof NormalizedBadge,
  direction: 'asc' | 'desc' = 'asc'
): NormalizedBadge[] {
  return [...badges].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return direction === 'asc' ? 1 : -1;
    if (bValue === null) return direction === 'asc' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return direction === 'asc'
        ? aValue === bValue
          ? 0
          : aValue
            ? 1
            : -1
        : aValue === bValue
          ? 0
          : aValue
            ? -1
            : 1;
    }

    // Default comparison for other types
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filters normalized badges by a search term
 * @param badges The badges to filter
 * @param searchTerm The search term to filter by
 * @returns The filtered badges
 */
export function filterBadgesBySearchTerm(
  badges: NormalizedBadge[],
  searchTerm: string
): NormalizedBadge[] {
  if (!searchTerm) return badges;

  const term = searchTerm.toLowerCase();
  return badges.filter(badge => {
    return (
      badge.name.toLowerCase().includes(term) ||
      (badge.description && badge.description.toLowerCase().includes(term)) ||
      (badge.issuerName && badge.issuerName.toLowerCase().includes(term)) ||
      (badge.criteria && badge.criteria.toLowerCase().includes(term))
    );
  });
}

/**
 * Filters normalized badges by type (OB2 or OB3)
 * @param badges The badges to filter
 * @param type The badge type to filter by
 * @returns The filtered badges
 */
export function filterBadgesByType(
  badges: NormalizedBadge[],
  type: 'OB2' | 'OB3' | 'all'
): NormalizedBadge[] {
  if (type === 'all') return badges;
  return badges.filter(badge => badge.type === type);
}

/**
 * Filters normalized badges by issuer
 * @param badges The badges to filter
 * @param issuerId The issuer ID to filter by
 * @returns The filtered badges
 */
export function filterBadgesByIssuer(
  badges: NormalizedBadge[],
  issuerId: string
): NormalizedBadge[] {
  return badges.filter(badge => badge.issuerId === issuerId);
}

/**
 * Filters normalized badges by recipient
 * @param badges The badges to filter
 * @param recipientId The recipient ID to filter by
 * @returns The filtered badges
 */
export function filterBadgesByRecipient(
  badges: NormalizedBadge[],
  recipientId: string
): NormalizedBadge[] {
  return badges.filter(badge => badge.recipientId === recipientId);
}

/**
 * Filters normalized badges by expiration status
 * @param badges The badges to filter
 * @param expired Whether to include only expired badges (true) or non-expired badges (false)
 * @returns The filtered badges
 */
export function filterBadgesByExpiration(
  badges: NormalizedBadge[],
  expired: boolean
): NormalizedBadge[] {
  return badges.filter(badge => badge.isExpired === expired);
}

/**
 * Groups normalized badges by a specific field
 * @param badges The badges to group
 * @param field The field to group by
 * @returns An object with the grouped badges
 */
export function groupBadges<K extends keyof NormalizedBadge>(
  badges: NormalizedBadge[],
  field: K
): Record<string, NormalizedBadge[]> {
  return badges.reduce(
    (groups, badge) => {
      const key = String(badge[field] || 'unknown');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(badge);
      return groups;
    },
    {} as Record<string, NormalizedBadge[]>
  );
}
