<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 32 })

// A stable per-name color instead of one flat brand color everywhere —
// cheap to compute, makes a list of agents visually scannable at a
// glance instead of a wall of identical green circles.
const PALETTE = ['#2e7d5c', '#0284c7', '#ea580c', '#7c3aed', '#be123c', '#0891b2', '#ca8a04', '#4338ca']

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!
}

const initials = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join(''),
)

const color = computed(() => hashColor(props.name))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
    :style="{ backgroundColor: color, width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px` }"
  >
    {{ initials }}
  </span>
</template>
