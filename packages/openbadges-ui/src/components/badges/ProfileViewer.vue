<script setup lang="ts">
import { computed } from "vue";
import type { OB2, OB3 } from "@/types";
import BadgeList from "@components/badges/BadgeList.vue";
import type { Profile } from "@/types";

interface Props {
  profile: Profile;
  badges: (OB2.Assertion | OB3.VerifiableCredential)[];
  loading?: boolean;
  badgesLayout?: "grid" | "list";
  badgesInteractive?: boolean;
  showPagination?: boolean;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  badgesLayout: "grid",
  badgesInteractive: true,
  showPagination: false,
  pageSize: 6,
});

const emit = defineEmits<{
  (e: "badge-click", badge: OB2.Assertion | OB3.VerifiableCredential): void;
}>();

// Compute the badges section title based on profile type
const badgesSectionTitle = computed(() => {
  if (props.profile.type === "Issuer") {
    return "Badges Offered";
  } else {
    return "Badges Earned";
  }
});

// Get initials from name for avatar placeholder
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Format URL for display (remove protocol and trailing slash)
const formatUrl = (url: string): string => {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

// Handle badge click
const handleBadgeClick = (badge: OB2.Assertion | OB3.VerifiableCredential) => {
  emit("badge-click", badge);
};
</script>

<template>
  <div class="manus-profile-viewer">
    <!-- Profile Header -->
    <section class="manus-profile-header" aria-labelledby="profile-title">
      <div class="manus-profile-avatar">
        <img
          v-if="profile.image"
          :src="profile.image"
          :alt="`${profile.name}'s avatar`"
          class="manus-profile-image"
        />
        <div v-else class="manus-profile-image-placeholder" aria-hidden="true">
          {{ getInitials(profile.name) }}
        </div>
      </div>

      <div class="manus-profile-info">
        <h2 id="profile-title" class="manus-profile-name">
          {{ profile.name }}
        </h2>

        <p v-if="profile.description" class="manus-profile-description">
          {{ profile.description }}
        </p>

        <div class="manus-profile-details">
          <div v-if="profile.email" class="manus-profile-detail">
            <span class="manus-profile-detail-label">Email:</span>
            <a
              :href="`mailto:${profile.email}`"
              class="manus-profile-detail-value"
            >
              {{ profile.email }}
            </a>
          </div>

          <div v-if="profile.url" class="manus-profile-detail">
            <span class="manus-profile-detail-label">Website:</span>
            <a
              :href="profile.url"
              target="_blank"
              rel="noopener noreferrer"
              class="manus-profile-detail-value"
            >
              {{ formatUrl(profile.url) }}
              <span class="visually-hidden">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Badges Section -->
    <section class="manus-profile-badges" aria-labelledby="badges-title">
      <h3 id="badges-title" class="manus-section-title">
        {{ badgesSectionTitle }}
      </h3>

      <div
        v-if="loading"
        class="manus-profile-loading"
        role="status"
        aria-live="polite"
      >
        <span>Loading badges...</span>
      </div>

      <div v-else>
        <slot name="badges-list" :badges="badges">
          <BadgeList
            :badges="badges"
            :layout="badgesLayout"
            :interactive="badgesInteractive"
            :show-pagination="showPagination"
            :page-size="pageSize"
            :aria-label="badgesSectionTitle"
            @badge-click="handleBadgeClick"
          />
        </slot>
      </div>
    </section>
  </div>
</template>

<style>
.manus-profile-viewer {
  --profile-padding: 24px;
  --profile-gap: 32px;
  --profile-border-color: #e2e8f0;
  --profile-background: #ffffff;
  --profile-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --profile-title-color: #1a202c;
  --profile-text-color: #4a5568;
  --profile-link-color: #3182ce;

  display: flex;
  flex-direction: column;
  gap: var(--profile-gap);
  padding: var(--profile-padding);
  background-color: var(--profile-background);
  border: 1px solid var(--profile-border-color);
  border-radius: 8px;
  box-shadow: var(--profile-shadow);
}

.manus-profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.manus-profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.manus-profile-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.manus-profile-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #4a5568;
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

.manus-profile-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--profile-title-color);
}

.manus-profile-description {
  margin: 8px 0 0;
  font-size: 0.875rem;
  color: var(--profile-text-color);
  line-height: 1.5;
}

.manus-profile-details {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manus-profile-detail {
  font-size: 0.875rem;
  color: var(--profile-text-color);
}

.manus-profile-detail-label {
  font-weight: 500;
  margin-right: 4px;
}

.manus-profile-detail-value {
  color: var(--profile-link-color);
  text-decoration: none;
}

.manus-profile-detail-value:hover {
  text-decoration: underline;
}

.manus-section-title {
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--profile-title-color);
}

.manus-profile-loading {
  padding: 24px;
  text-align: center;
  color: var(--profile-text-color);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .manus-profile-header {
    flex-direction: row;
    text-align: left;
  }

  .manus-profile-info {
    flex: 1;
  }
}
</style>
