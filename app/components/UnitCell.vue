<script setup lang="ts">
import type { Unit } from '~/stores/useUnitsStore'

defineProps<{ unit: Unit }>()
defineEmits<{ select: [id: number] }>()
</script>

<template>
  <button
    type="button"
    class="group relative flex flex-col items-start justify-between rounded-lg border-[1.5px] px-2.5 py-2 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
    :class="[STATUS_BG_SOFT[unit.status], STATUS_BORDER[unit.status]]"
    @click="$emit('select', unit.id)"
  >
    <span
      v-if="unit.hasOverdueInstallment"
      class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-status-deposit ring-2 ring-card"
      title="Просроченный платёж по рассрочке"
    />
    <span class="text-[11px] font-semibold text-ink">{{ unit.label }}</span>
    <span class="text-[10px] text-ink-soft">{{ unit.rooms === 0 ? 'студия' : `${unit.rooms}-комн` }} · {{ unit.area }} м²</span>
    <span class="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" :class="STATUS_BG[unit.status]">
      {{ STATUS_LABEL[unit.status] }}
    </span>
  </button>
</template>
