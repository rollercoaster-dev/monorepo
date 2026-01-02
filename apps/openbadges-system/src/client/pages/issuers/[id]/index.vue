<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
// Issuer profile logic will go here
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Issuer Profile</h1>
      <div class="space-x-2">
        <RouterLink
          :to="`/issuers/${'id' in route.params ? route.params.id : ''}/edit`"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Edit
        </RouterLink>
        <RouterLink
          :to="`/issuers/${'id' in route.params ? route.params.id : ''}/badges`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          View Badges
        </RouterLink>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Issuer information placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Issuer Information</h2>
        <p class="text-gray-500">Logo, name, description, URL, contact info</p>
      </div>

      <!-- Issuer statistics placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Statistics</h2>
        <p class="text-gray-500">Badge classes created, badges issued, recent activity</p>
      </div>

      <!-- Recent badges placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Recent Badge Classes</h2>
        <p class="text-gray-500">Grid of recent badge classes from this issuer</p>
      </div>
    </div>
  </div>
</template>
