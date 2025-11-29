// src/composables/useBadges.ts
import { ref, computed } from "vue";
import type { ComputedRef } from "vue";
import type { OB2, OB3 } from "@/types";
import { BadgeService } from "@services/BadgeService";

/**
 * Composable for managing a collection of badges
 * Provides functionality to filter, sort, and transform badges for display
 */
export function useBadges(
  initialBadges: (OB2.Assertion | OB3.VerifiableCredential)[] = [],
): {
  badges: ReturnType<typeof ref<(OB2.Assertion | OB3.VerifiableCredential)[]>>;
  filterText: ReturnType<typeof ref<string>>;
  sortBy: ReturnType<typeof ref<"issuedOn" | "name">>;
  sortDirection: ReturnType<typeof ref<"asc" | "desc">>;
  filteredBadges: ComputedRef<(OB2.Assertion | OB3.VerifiableCredential)[]>;
  sortedBadges: ComputedRef<(OB2.Assertion | OB3.VerifiableCredential)[]>;
  normalizedBadges: ComputedRef<
    ReturnType<typeof BadgeService.normalizeBadge>[]
  >;
  badgesByIssuer: ComputedRef<
    Record<string, ReturnType<typeof BadgeService.normalizeBadge>[]>
  >;
  addBadge: (badge: OB2.Assertion | OB3.VerifiableCredential) => void;
  removeBadge: (badgeId: string) => void;
  setBadges: (newBadges: (OB2.Assertion | OB3.VerifiableCredential)[]) => void;
  setFilter: (text: string) => void;
  setSorting: (by: "issuedOn" | "name", direction?: "asc" | "desc") => void;
} {
  // State
  const badges =
    ref<(OB2.Assertion | OB3.VerifiableCredential)[]>(initialBadges);
  const filterText = ref("");
  const sortBy = ref<"issuedOn" | "name">("issuedOn");
  const sortDirection = ref<"asc" | "desc">("desc");

  // Computed properties
  const filteredBadges = computed(() => {
    if (!filterText.value) {
      return badges.value;
    }

    const searchTerm = filterText.value.toLowerCase();
    return badges.value.filter((badge) => {
      const normalized = BadgeService.normalizeBadge(badge);
      return (
        normalized.name.toLowerCase().includes(searchTerm) ||
        normalized.description.toLowerCase().includes(searchTerm) ||
        normalized.issuer.name.toLowerCase().includes(searchTerm)
      );
    });
  });

  const sortedBadges = computed(() => {
    const sorted = [...filteredBadges.value];

    sorted.sort((a, b) => {
      const normalizedA = BadgeService.normalizeBadge(a);
      const normalizedB = BadgeService.normalizeBadge(b);

      if (sortBy.value === "name") {
        return sortDirection.value === "asc"
          ? normalizedA.name.localeCompare(normalizedB.name)
          : normalizedB.name.localeCompare(normalizedA.name);
      } else {
        // Sort by issuedOn date
        const dateA = new Date(normalizedA.issuedOn).getTime();
        const dateB = new Date(normalizedB.issuedOn).getTime();
        return sortDirection.value === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return sorted;
  });

  // Normalized badges for display
  const normalizedBadges = computed(() => {
    return sortedBadges.value.map((badge) =>
      BadgeService.normalizeBadge(badge),
    );
  });

  // Group badges by issuer
  const badgesByIssuer = computed(() => {
    const grouped: Record<string, typeof normalizedBadges.value> = {};

    normalizedBadges.value.forEach((badge) => {
      const issuerName = badge.issuer.name || "Unknown Issuer";
      if (!grouped[issuerName]) {
        grouped[issuerName] = [];
      }
      grouped[issuerName].push(badge);
    });

    return grouped;
  });

  // Methods
  const addBadge = (badge: OB2.Assertion | OB3.VerifiableCredential) => {
    badges.value.push(badge);
  };

  const removeBadge = (badgeId: string) => {
    const index = badges.value.findIndex((b) => b.id === badgeId);
    if (index !== -1) {
      badges.value.splice(index, 1);
    }
  };

  const setBadges = (
    newBadges: (OB2.Assertion | OB3.VerifiableCredential)[],
  ) => {
    badges.value = newBadges;
  };

  const setFilter = (text: string) => {
    filterText.value = text;
  };

  const setSorting = (
    by: "issuedOn" | "name",
    direction: "asc" | "desc" = "desc",
  ) => {
    sortBy.value = by;
    sortDirection.value = direction;
  };

  return {
    // State
    badges,
    filterText,
    sortBy,
    sortDirection,

    // Computed
    filteredBadges,
    sortedBadges,
    normalizedBadges,
    badgesByIssuer,

    // Methods
    addBadge,
    removeBadge,
    setBadges,
    setFilter,
    setSorting,
  };
}
