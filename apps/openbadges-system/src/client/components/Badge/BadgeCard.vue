<script setup lang="ts">
import {
  PencilIcon,
  EyeIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import type { OB2 } from 'openbadges-types'

interface BadgeCardProps {
  badge: OB2.BadgeClass & {
    createdAt?: string
    tags?: string[]
    issuedCount?: number
    earnedCount?: number
  }
}

defineProps<BadgeCardProps>()

defineEmits<{
  edit: [badge: BadgeCardProps['badge']]
  view: [badge: BadgeCardProps['badge']]
  delete: [badge: BadgeCardProps['badge']]
  issue: [badge: BadgeCardProps['badge']]
  duplicate: [badge: BadgeCardProps['badge']]
}>()

function getIssuerName(issuer: OB2.Profile | string): string {
  if (typeof issuer === 'string') {
    return issuer
  }
  return issuer.name || 'Unknown Issuer'
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getImageSrc(image: string | OB2.Image | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  return image.id || undefined
}
</script>

<template>
  <div
    class="bg-card rounded-md border-2 border-border shadow-hard-md p-6 hover:shadow-hard-lg transition-shadow"
  >
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center space-x-4">
        <div class="flex-shrink-0">
          <img
            v-if="badge.image"
            :src="getImageSrc(badge.image)"
            :alt="badge.name"
            class="w-16 h-16 rounded-md object-cover"
          />
          <div
            v-else
            class="w-16 h-16 rounded-md bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center"
          >
            <TrophyIcon class="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-foreground truncate">
            {{ badge.name }}
          </h3>
          <p class="text-sm text-muted-foreground line-clamp-2">
            {{ badge.description }}
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          class="p-2 text-muted-foreground hover:text-primary transition-colors"
          title="Edit badge"
          @click="$emit('edit', badge)"
        >
          <PencilIcon class="w-4 h-4" />
        </button>
        <button
          class="p-2 text-muted-foreground hover:text-success transition-colors"
          title="View badge"
          @click="$emit('view', badge)"
        >
          <EyeIcon class="w-4 h-4" />
        </button>
        <button
          class="p-2 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete badge"
          @click="$emit('delete', badge)"
        >
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Issuer:</span>
        <span class="font-medium text-foreground">{{ getIssuerName(badge.issuer) }}</span>
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Created:</span>
        <span class="text-foreground">{{ formatDate(badge.createdAt) }}</span>
      </div>

      <div v-if="badge.tags && badge.tags.length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="tag in badge.tags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
        >
          {{ tag }}
        </span>
        <span
          v-if="badge.tags.length > 3"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
        >
          +{{ badge.tags.length - 3 }} more
        </span>
      </div>

      <div class="flex items-center justify-between pt-2 border-t-2 border-border">
        <div class="flex items-center space-x-4 text-sm text-muted-foreground">
          <div class="flex items-center space-x-1">
            <UserGroupIcon class="w-4 h-4" />
            <span>{{ badge.issuedCount || 0 }} issued</span>
          </div>
          <div class="flex items-center space-x-1">
            <CheckCircleIcon class="w-4 h-4" />
            <span>{{ badge.earnedCount || 0 }} earned</span>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            class="text-xs text-primary hover:text-primary-dark font-medium"
            @click="$emit('issue', badge)"
          >
            Issue
          </button>
          <button
            class="text-xs text-muted-foreground hover:text-foreground font-medium"
            @click="$emit('duplicate', badge)"
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
