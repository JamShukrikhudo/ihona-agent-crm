<script setup lang="ts">
import type { Lead } from '~/stores/useLeadsStore'

const props = defineProps<{ leads: Lead[]; days?: number }>()

const dayCount = computed(() => props.days ?? 14)

interface Bucket {
  label: string
  count: number
}

const buckets = computed<Bucket[]>(() => {
  const days: Bucket[] = []
  const now = new Date()
  for (let i = dayCount.value - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    days.push({ label: day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), count: 0 })
  }

  const startOfWindow = new Date(now)
  startOfWindow.setDate(startOfWindow.getDate() - (dayCount.value - 1))
  startOfWindow.setHours(0, 0, 0, 0)

  for (const lead of props.leads) {
    const created = new Date(lead.createdAt)
    if (created < startOfWindow) {
      continue
    }
    const offset = Math.floor((created.getTime() - startOfWindow.getTime()) / 86_400_000)
    if (offset >= 0 && offset < days.length) {
      days[offset]!.count++
    }
  }

  return days
})

const max = computed(() => Math.max(1, ...buckets.value.map((b) => b.count)))
</script>

<template>
  <div class="flex h-24 items-end gap-1">
    <div v-for="(bucket, i) in buckets" :key="i" class="group relative flex-1">
      <div
        class="mx-auto w-full rounded-t bg-brand-600 transition-all"
        :class="bucket.count === 0 ? 'bg-line' : 'bg-brand-600'"
        :style="{ height: `${Math.max(4, (bucket.count / max) * 96)}px` }"
      />
      <div
        class="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block"
      >
        {{ bucket.label }}: {{ bucket.count }}
      </div>
    </div>
  </div>
</template>
