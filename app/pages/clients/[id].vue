<script setup lang="ts">
definePageMeta({ middleware: 'agent' })

const route = useRoute()
const clientId = computed(() => Number(route.params.id))
</script>

<template>
  <div class="min-h-screen bg-paper">
    <ClientDrawer :client-id="clientId" @close="navigateTo('/clients')" />
  </div>
</template>
