<script setup lang="ts">
const props = defineProps<{ value: number; total: number; size?: number }>()

const size = computed(() => props.size ?? 56)
const radius = computed(() => size.value / 2 - 6)
const circumference = computed(() => 2 * Math.PI * radius.value)
const fraction = computed(() => (props.total > 0 ? props.value / props.total : 0))
const dashOffset = computed(() => circumference.value * (1 - fraction.value))
const percent = computed(() => Math.round(fraction.value * 100))
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      stroke="var(--color-paper)"
      :stroke-width="6"
    />
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      fill="none"
      stroke="var(--color-brand-600)"
      :stroke-width="6"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      style="transition: stroke-dashoffset 0.4s ease"
    />
    <text
      :x="size / 2"
      :y="size / 2"
      text-anchor="middle"
      dominant-baseline="central"
      class="fill-ink font-display"
      :style="{ fontSize: `${size * 0.22}px`, fontWeight: 700 }"
    >
      {{ percent }}%
    </text>
  </svg>
</template>
