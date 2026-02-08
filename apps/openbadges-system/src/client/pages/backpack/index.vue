<script setup lang="ts">
// Backpack logic will go here
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8">
    <h1 class="font-headline text-2xl font-bold text-foreground mb-6">My Badge Backpack</h1>

    <div class="space-y-6">
      <!-- Backpack summary placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Summary</h2>
        <p class="text-muted-foreground">Total badges earned, recent achievements, progress</p>
      </div>

      <!-- Badge collection placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">My Badges</h2>
        <p class="text-muted-foreground">Grid of earned badges with filtering and sorting</p>
      </div>

      <!-- Sharing options placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Sharing</h2>
        <p class="text-muted-foreground">
          Public backpack URL, social media sharing, export options
        </p>
      </div>
    </div>
  </div>
</template>
