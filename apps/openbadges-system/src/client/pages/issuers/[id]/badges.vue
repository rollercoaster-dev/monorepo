<template>
  <div class="max-w-6xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Badges by Issuer</h1>
      <RouterLink
        to="/badges/create"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Create Badge
      </RouterLink>
    </div>

    <div class="space-y-6">
      <!-- Issuer info placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Issuer Information</h2>
        <p class="text-gray-500">Brief issuer info with logo and name</p>
      </div>

      <!-- Badge filters placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Filters</h2>
        <p class="text-gray-500">Filter by status, category, date created</p>
      </div>

      <!-- Badge grid placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Badge Classes</h2>
        <p class="text-gray-500">Grid of badge classes from this issuer</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Issuer badges logic will go here
// const route = useRoute() - will be added when implementing badge filtering by issuer
</script>
