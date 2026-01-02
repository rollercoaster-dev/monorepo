<script setup lang="ts">
// Issuer management logic will go here
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Manage My Issuers</h1>
      <RouterLink
        to="/issuers/create"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Create Issuer
      </RouterLink>
    </div>

    <div class="space-y-6">
      <!-- Issuer management placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">My Issuers</h2>
        <p class="text-gray-500">List of issuers you own/manage with quick actions</p>
      </div>

      <!-- Issuer permissions placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Permissions</h2>
        <p class="text-gray-500">Issuers where you have specific permissions</p>
      </div>

      <!-- Issuer invitations placeholder -->
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <h2 class="text-lg font-semibold mb-4">Invitations</h2>
        <p class="text-gray-500">Pending invitations to join other issuers</p>
      </div>
    </div>
  </div>
</template>
