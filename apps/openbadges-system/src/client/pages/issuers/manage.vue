<script setup lang="ts">
// Issuer management logic will go here
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Manage My Issuers</h1>
      <RouterLink to="/issuers/create" class="btn btn-primary">Create Issuer</RouterLink>
    </div>

    <div class="space-y-6">
      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">My Issuers</h2>
        <p class="text-muted-foreground">List of issuers you own/manage with quick actions</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Permissions</h2>
        <p class="text-muted-foreground">Issuers where you have specific permissions</p>
      </div>

      <div class="border-2 border-dashed border-border rounded-md p-8">
        <h2 class="text-lg font-semibold mb-4">Invitations</h2>
        <p class="text-muted-foreground">Pending invitations to join other issuers</p>
      </div>
    </div>
  </div>
</template>
