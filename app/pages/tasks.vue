<script setup lang="ts">
definePageMeta({ middleware: 'agent' })
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Внутренние задачи</div>
      <h1 class="font-display text-xl font-bold text-ink">Доска задач</h1>
    </div>

    <div class="px-6 py-6">
      <TaskBoard />
    </div>
  </div>
</template>
