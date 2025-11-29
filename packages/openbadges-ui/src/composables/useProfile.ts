// src/composables/useProfile.ts
import { ref, computed } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { OB2, OB3 } from "@/types";
import { BadgeService } from "@services/BadgeService";
import type { Profile, ProfileType } from "@/types";

// Return type for the useProfile composable
export interface UseProfileReturn {
  // State
  profile: Ref<Profile | null>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;

  // Computed
  isIssuer: ComputedRef<boolean>;
  isRecipient: ComputedRef<boolean>;
  displayName: ComputedRef<string>;

  // Methods
  setProfile: (newProfile: Profile) => void;
  loadProfile: (profileId: string, type?: ProfileType) => Promise<void>;
  clearProfile: () => void;
  extractIssuerFromBadge: (
    badge: OB2.Assertion | OB3.VerifiableCredential,
  ) => Profile | null;
}

/**
 * Composable for managing profile data (issuer or recipient)
 * Provides functionality to load and display profile information
 *
 * @param initialProfile - Optional initial profile data
 * @returns An object containing profile state, computed properties, and methods
 */
export function useProfile(initialProfile?: Profile): UseProfileReturn {
  // State
  const profile = ref<Profile | null>(initialProfile || null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const isIssuer = computed(() => {
    return profile.value?.type === "Issuer";
  });

  const isRecipient = computed(() => {
    return profile.value?.type === "Recipient";
  });

  const displayName = computed(() => {
    return profile.value?.name || "Unknown";
  });

  // Methods
  const setProfile = (newProfile: Profile) => {
    profile.value = newProfile;
    error.value = null;
  };

  const loadProfile = async (
    profileId: string,
    type: ProfileType = "Recipient",
  ) => {
    isLoading.value = true;
    error.value = null;

    try {
      // In a real implementation, this would fetch the profile from an API
      // For now, we'll just simulate a delay and return a mock profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      // This is a placeholder - in a real app, you would fetch actual data
      profile.value = {
        id: profileId,
        name: `${type} ${profileId.substring(0, 8)}`,
        image: `https://ui-avatars.com/api/?name=${type}+${profileId.substring(
          0,
          8,
        )}&background=random`,
        description: `This is a ${type.toLowerCase()} profile.`,
        type,
      };
    } catch (e) {
      if (e instanceof Error) {
        error.value = e.message;
      } else {
        error.value = "Failed to load profile";
      }
      profile.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const clearProfile = () => {
    profile.value = null;
    error.value = null;
  };

  /**
   * Extract issuer profile from a badge
   *
   * @param badge - An Open Badges assertion or verifiable credential
   * @returns A Profile object for the issuer, or null if extraction fails
   */
  const extractIssuerFromBadge = (
    badge: OB2.Assertion | OB3.VerifiableCredential,
  ): Profile | null => {
    try {
      const normalized = BadgeService.normalizeBadge(badge);

      if (!normalized.issuer.name) {
        return null;
      }

      // Create a properly typed issuer profile
      const issuerProfile: Profile = {
        id: normalized.issuer.url || `issuer:${normalized.issuer.name}`,
        name: normalized.issuer.name,
        type: "Issuer" as const,
      };

      // Add optional properties if they exist
      if (normalized.issuer.image) {
        issuerProfile.image = normalized.issuer.image;
      }

      if (normalized.issuer.url) {
        issuerProfile.url = normalized.issuer.url;
      }

      return issuerProfile;
    } catch (e) {
      return null;
    }
  };

  return {
    // State
    profile,
    isLoading,
    error,

    // Computed
    isIssuer,
    isRecipient,
    displayName,

    // Methods
    setProfile,
    loadProfile,
    clearProfile,
    extractIssuerFromBadge,
  };
}
