<script setup lang="ts">
import { Calendar } from '@lucide/vue'
import type { BoardTask } from '~/stores/useBoardStore'

defineProps<{ task: BoardTask }>()
defineEmits<{ open: [BoardTask] }>()

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <button
    type="button"
    class="w-full rounded-xl border border-line bg-card p-3 text-left shadow-sm hover:shadow-md"
    @click="$emit('open', task)"
  >
    <div class="text-[13px] font-semibold text-ink">{{ task.title }}</div>
    <p v-if="task.description" class="mt-1 line-clamp-2 text-[12px] text-ink-soft">{{ task.description }}</p>
    <div v-if="task.assigneeName || task.dueAt" class="mt-2 flex items-center justify-between gap-2">
      <span v-if="task.assigneeName" class="flex items-center gap-1.5">
        <AgentAvatar :name="task.assigneeName" :size="18" />
        <span class="text-[11px] text-ink-soft">{{ task.assigneeName }}</span>
      </span>
      <span v-if="task.dueAt" class="flex items-center gap-1 text-[11px] text-ink-soft">
        <Calendar :size="11" /> {{ formatDue(task.dueAt) }}
      </span>
    </div>
  </button>
</template>
