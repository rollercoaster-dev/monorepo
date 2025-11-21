<template>
  <div class="max-w-4xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Badge Details</h1>
      <div class="space-x-2">
        <RouterLink
          :to="`/badges/${'id' in route.params ? route.params.id : ''}/edit`"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Edit
        </RouterLink>
        <RouterLink
          :to="`/badges/${'id' in route.params ? route.params.id : ''}/issue`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Issue Badge
        </RouterLink>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Badge display placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Badge Class Information</h2>
        <p class="text-gray-500">Badge image, name, description, criteria, issuer info</p>
      </div>

      <!-- Badge statistics placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Statistics</h2>
        <p class="text-gray-500">Number of badges issued, recent recipients</p>
      </div>

      <!-- Recent assertions placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Recent Assertions</h2>
        <p class="text-gray-500">List of recent badge assertions</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
// Badge details logic will go here
</script>
