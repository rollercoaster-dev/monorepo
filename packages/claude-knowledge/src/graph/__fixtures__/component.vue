<script setup lang="ts">
import { ref } from "vue";
import type { OB2 } from "openbadges-types";

interface BadgeProps {
  badge: OB2.BadgeClass;
}

defineProps<BadgeProps>();

/**
 * Format a date string for display.
 * @param dateString - ISO date string
 * @returns Formatted date
 */
function _formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

const count = ref(0);

function increment() {
  count.value++;
}
</script>

<template>
  <div class="badge-card">
    <h3>{{ badge.name }}</h3>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
