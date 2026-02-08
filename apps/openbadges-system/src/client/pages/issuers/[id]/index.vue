<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
// Issuer profile logic will go here
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Issuer Profile</h1>
      <div class="space-x-2">
        <RouterLink
          :to="`/issuers/${'id' in route.params ? route.params.id : ''}/edit`"
          class="btn btn-secondary"
        >
          Edit
        </RouterLink>
        <RouterLink
          :to="`/issuers/${'id' in route.params ? route.params.id : ''}/badges`"
          class="btn btn-primary"
        >
          View Badges
        </RouterLink>
      </div>
    </div>

    <div class="space-y-6">
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Issuer Information</h2>
        <p class="text-muted-foreground">Logo, name, description, URL, contact info</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Statistics</h2>
        <p class="text-muted-foreground">Badge classes created, badges issued, recent activity</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Recent Badge Classes</h2>
        <p class="text-muted-foreground">Grid of recent badge classes from this issuer</p>
      </div>
    </div>
  </div>
</template>
