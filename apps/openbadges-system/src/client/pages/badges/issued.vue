<script setup lang="ts">
definePage({ meta: { requiresAuth: true } })
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8">
    <h1 class="font-headline text-2xl font-bold text-foreground mb-6">Issued Badges</h1>

    <div class="space-y-6">
      <!-- Search and filters placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Search & Filters</h2>
        <p class="text-muted-foreground">Filter by badge class, recipient, date range, status</p>
      </div>

      <!-- Issued badges list placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Badge Assertions</h2>
        <p class="text-muted-foreground">
          List of all badge assertions with recipient info, issue date, status
        </p>
      </div>

      <!-- Batch operations placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Batch Operations</h2>
        <p class="text-muted-foreground">Bulk revoke, export, status updates</p>
      </div>
    </div>
  </div>
</template>
