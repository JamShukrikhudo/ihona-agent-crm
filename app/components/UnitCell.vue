<script setup lang="ts">
import type { Unit } from '~/stores/useUnitsStore'

const props = defineProps<{ unit: Unit }>()

defineEmits<{ select: [id: number] }>()

// CSS variable, not an inline JS color map — sprint-0's own spec calls this
// out explicitly ("для будущей темизации"): a future theme only has to
// override --status-color per status class, not touch this component.
const statusClass = computed(() => `status-${props.unit.status}`)
</script>

<template>
  <button
    type="button"
    class="unit-cell"
    :class="statusClass"
    @click="$emit('select', unit.id)"
  >
    <span class="unit-cell__rooms">{{ unit.rooms === 0 ? 'студия' : unit.rooms }}</span>
    <span class="unit-cell__area">{{ unit.area ?? '—' }} м²</span>
  </button>
</template>

<style scoped>
.unit-cell {
  --status-color: var(--color-status-free);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  aspect-ratio: 1;
  min-width: 64px;
  border-radius: 0.5rem;
  border: 2px solid var(--status-color);
  background: color-mix(in srgb, var(--status-color) 16%, transparent);
  color: var(--status-color);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.1s,
    background 0.1s;
}

.unit-cell:hover {
  transform: scale(1.05);
  background: color-mix(in srgb, var(--status-color) 28%, transparent);
}

.unit-cell__area {
  font-weight: 400;
  opacity: 0.8;
}

.unit-cell.status-free {
  --status-color: var(--color-status-free);
}

.unit-cell.status-reserved {
  --status-color: var(--color-status-reserved);
}

.unit-cell.status-deposit {
  --status-color: var(--color-status-deposit);
}

.unit-cell.status-sold {
  --status-color: var(--color-status-sold);
  opacity: 0.7;
  cursor: default;
}
</style>
