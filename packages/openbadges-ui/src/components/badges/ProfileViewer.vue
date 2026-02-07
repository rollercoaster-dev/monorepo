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
  <div class="ob-profile-viewer">
    <!-- Profile Header -->
    <section class="ob-profile-viewer__header" aria-labelledby="profile-title">
      <div class="ob-profile-viewer__avatar">
        <img
          v-if="profile.image"
          :src="profile.image"
          :alt="`${profile.name}'s avatar`"
          class="ob-profile-viewer__image"
        />
        <div
          v-else
          class="ob-profile-viewer__image-placeholder"
          aria-hidden="true"
        >
          {{ getInitials(profile.name) }}
        </div>
      </div>

      <div class="ob-profile-viewer__info">
        <h2 id="profile-title" class="ob-profile-viewer__name">
          {{ profile.name }}
        </h2>

        <p v-if="profile.description" class="ob-profile-viewer__description">
          {{ profile.description }}
        </p>

        <div class="ob-profile-viewer__details">
          <div v-if="profile.email" class="ob-profile-viewer__detail">
            <span class="ob-profile-viewer__detail-label">Email:</span>
            <a
              :href="`mailto:${profile.email}`"
              class="ob-profile-viewer__detail-value"
            >
              {{ profile.email }}
            </a>
          </div>

          <div v-if="profile.url" class="ob-profile-viewer__detail">
            <span class="ob-profile-viewer__detail-label">Website:</span>
            <a
              :href="profile.url"
              target="_blank"
              rel="noopener noreferrer"
              class="ob-profile-viewer__detail-value"
            >
              {{ formatUrl(profile.url) }}
              <span class="visually-hidden">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Badges Section -->
    <section class="ob-profile-viewer__badges" aria-labelledby="badges-title">
      <h3 id="badges-title" class="ob-profile-viewer__section-title">
        {{ badgesSectionTitle }}
      </h3>

      <div
        v-if="loading"
        class="ob-profile-viewer__loading"
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
.ob-profile-viewer {
  --profile-padding: var(--ob-profile-padding, var(--ob-space-6));
  --profile-gap: var(--ob-profile-gap, var(--ob-space-8));
  --profile-border-color: var(--ob-border);
  --profile-background: var(--ob-card);
  --profile-shadow: var(--ob-shadow-hard-md);
  --profile-title-color: var(--ob-foreground);
  --profile-text-color: var(--ob-muted-foreground);
  --profile-link-color: var(--ob-primary);

  display: flex;
  flex-direction: column;
  gap: var(--profile-gap);
  padding: var(--profile-padding);
  background-color: var(--profile-background);
  border: var(--ob-border-width-medium) solid var(--profile-border-color);
  border-radius: var(--ob-border-radius-sm);
  box-shadow: var(--profile-shadow);
  font-family: var(--ob-font-family);
  color: var(--profile-text-color);
}

.ob-profile-viewer__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-4);
  text-align: center;
}

.ob-profile-viewer__avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.ob-profile-viewer__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ob-profile-viewer__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ob-gray-700);
  color: var(--ob-text-inverse);
  font-size: var(--ob-font-size-2xl);
  font-weight: var(--ob-font-weight-bold);
}

.ob-profile-viewer__name {
  margin: 0;
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-2xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  line-height: var(--ob-font-lineHeight-tight);
  color: var(--profile-title-color);
}

.ob-profile-viewer__description {
  margin: var(--ob-space-2) 0 0;
  font-size: var(--ob-font-size-sm);
  color: var(--profile-text-color);
  line-height: var(--ob-line-height-normal);
}

.ob-profile-viewer__details {
  margin-top: var(--ob-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1);
}

.ob-profile-viewer__detail {
  font-size: var(--ob-font-size-sm);
  color: var(--profile-text-color);
}

.ob-profile-viewer__detail-label {
  font-weight: var(--ob-font-weight-medium);
  margin-right: var(--ob-space-1);
}

.ob-profile-viewer__detail-value {
  font-family: var(--ob-font-mono);
  color: var(--profile-link-color);
  text-decoration: none;
}

.ob-profile-viewer__detail-value:hover {
  text-decoration: underline;
}

.ob-profile-viewer__section-title {
  margin: 0 0 var(--ob-space-4);
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  color: var(--profile-title-color);
}

.ob-profile-viewer__loading {
  padding: var(--ob-space-6);
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
  .ob-profile-viewer__header {
    flex-direction: row;
    text-align: left;
  }

  .ob-profile-viewer__info {
    flex: 1;
  }
}
</style>
