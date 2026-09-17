<script setup lang="ts">
import type { Permission } from '~/stores/auth'

const props = defineProps<{ permission: Permission }>()

const { can } = usePermissions()
const allowed = computed(() => can(props.permission))
</script>

<template>
  <template v-if="allowed">
    <slot />
  </template>
</template>
