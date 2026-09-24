<script setup lang="ts">
const props = defineProps<{ points: { label: string; value: number }[] }>()

const width = 100
const height = 40

const max = computed(() => Math.max(1, ...props.points.map((p) => p.value)))

const path = computed(() => {
  if (props.points.length < 2) {
    return ''
  }
  const step = width / (props.points.length - 1)
  return props.points
    .map((p, i) => {
      const x = i * step
      const y = height - (p.value / max.value) * (height - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" class="h-24 w-full overflow-visible">
      <path :d="path" fill="none" stroke="var(--color-brand-600)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
    <div class="mt-1 flex justify-between text-[10px] text-ink-soft">
      <span v-for="p in points" :key="p.label">{{ p.label }}</span>
    </div>
  </div>
</template>
