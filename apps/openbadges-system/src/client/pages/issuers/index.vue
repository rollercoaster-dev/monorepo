<template>
  <div class="max-w-6xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Issuer Directory</h1>
      <RouterLink
        to="/issuers/create"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Create Issuer
      </RouterLink>
    </div>

    <div class="space-y-6">
      <!-- Search and filters placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Search & Filters</h2>
        <p class="text-gray-500">Search issuers by name, organization, location</p>
      </div>

      <!-- Issuer grid placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Issuers</h2>
        <p class="text-gray-500">Grid of issuers with logo, name, description, badge count</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Issuer directory logic will go here
</script>
