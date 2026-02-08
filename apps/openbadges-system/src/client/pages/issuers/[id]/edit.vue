<script setup lang="ts">
// Issuer editing logic will go here
// const route = useRoute() - will be added when implementing editing
</script>

<template>
  <div class="card card-body max-w-2xl mx-auto mt-8">
    <h1 class="font-headline text-2xl font-bold text-foreground mb-6">Edit Issuer</h1>
    <div class="space-y-6">
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Basic Information</h2>
        <p class="text-muted-foreground">Edit name, description, URL, email, logo</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Contact Information</h2>
        <p class="text-muted-foreground">Edit address, phone, social media links</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Verification Settings</h2>
        <p class="text-muted-foreground">Update public key, verification method</p>
      </div>
    </div>
  </div>
</template>
