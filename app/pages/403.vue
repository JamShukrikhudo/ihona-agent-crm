<script setup lang="ts">
import { ShieldOff } from '@lucide/vue'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper text-center">
    <ShieldOff :size="28" class="text-ink-soft" />
    <p class="max-w-xs text-[15px] text-ink">У вас нет доступа к этому разделу.</p>
    <NuxtLink to="/" class="text-[13px] font-medium text-brand-600 hover:underline">На главную</NuxtLink>
  </div>
</template>
