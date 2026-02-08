<script setup lang="ts">
definePage({ meta: { requiresAuth: true } })
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Badge Assertion</h1>
      <div class="space-x-2">
        <button class="btn btn-primary">Share</button>
        <button class="btn btn-secondary">Download</button>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Badge assertion display placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Badge Information</h2>
        <p class="text-muted-foreground">Badge image, name, description, criteria, issuer</p>
      </div>

      <!-- Assertion details placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Assertion Details</h2>
        <p class="text-muted-foreground">
          Issued date, evidence, recipient info, verification status
        </p>
      </div>

      <!-- Verification info placeholder -->
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Verification</h2>
        <p class="text-muted-foreground">
          Digital signature, blockchain verification, public key info
        </p>
      </div>
    </div>
  </div>
</template>
