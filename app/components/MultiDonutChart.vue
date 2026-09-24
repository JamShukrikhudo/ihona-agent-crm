<script setup lang="ts">
interface Segment {
  label: string
  value: number
  color: string
}

const props = withDefaults(defineProps<{ segments: Segment[]; size?: number }>(), { size: 96 })

const radius = computed(() => props.size / 2 - 8)
const circumference = computed(() => 2 * Math.PI * radius.value)
const total = computed(() => Math.max(1, props.segments.reduce((sum, s) => sum + s.value, 0)))

// Each segment is one dash on the same circle, offset by the running sum
// of everything before it — the classic stroke-dasharray multi-donut
// trick, no charting library needed.
const arcs = computed(() => {
  let offset = 0
  return props.segments.map((segment) => {
    const fraction = segment.value / total.value
    const length = fraction * circumference.value
    const arc = { ...segment, length, offset: -offset }
    offset += length
    return arc
  })
})
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
    <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="var(--color-paper)" :stroke-width="10" />
    <circle
      v-for="arc in arcs"
      :key="arc.label"
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      :stroke="arc.color"
      :stroke-width="10"
      :stroke-dasharray="`${arc.length} ${circumference - arc.length}`"
      :stroke-dashoffset="arc.offset"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`"
    />
  </svg>
</template>
