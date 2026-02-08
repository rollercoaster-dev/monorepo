<script setup lang="ts">
// Issuer creation logic will go here
</script>

<template>
  <div class="card card-body max-w-2xl mx-auto mt-8">
    <h1 class="font-headline text-2xl font-bold text-foreground mb-6">Create New Issuer</h1>
    <div class="space-y-6">
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Basic Information</h2>
        <p class="text-muted-foreground">Name, description, URL, email, logo upload</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Contact Information</h2>
        <p class="text-muted-foreground">Address, phone, social media links</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Verification</h2>
        <p class="text-muted-foreground">Public key, verification method settings</p>
      </div>
    </div>
  </div>
</template>
