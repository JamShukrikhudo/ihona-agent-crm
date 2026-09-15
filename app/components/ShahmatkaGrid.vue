<script setup lang="ts">
import type { Unit } from '~/stores/useUnitsStore'

const props = defineProps<{ units: Unit[]; loading: boolean }>()

defineEmits<{ select: [id: number] }>()

// Sorted descending (top floor first) — matches how a real building's
// floor plan reads.
const floors = computed(() => {
  const map = new Map<number, Unit[]>()
  for (const unit of props.units) {
    const list = map.get(unit.floor) ?? []
    list.push(unit)
    map.set(unit.floor, list)
  }
  return [...map.entries()].sort(([a], [b]) => b - a)
})
</script>

<template>
  <div v-if="loading" class="p-8 text-center text-ink-soft">Загрузка шахматки…</div>

  <div v-else-if="floors.length === 0" class="p-8 text-center text-ink-soft">Нет юнитов, подходящих под фильтр.</div>

  <div v-else class="space-y-3">
    <div v-for="[floorNumber, floorUnits] in floors" :key="floorNumber" class="flex items-start gap-3">
      <div class="mt-1 flex h-8 w-16 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-[12px] font-semibold text-ink-soft">
        Этаж {{ floorNumber }}
      </div>
      <div class="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        <UnitCell v-for="unit in floorUnits" :key="unit.id" :unit="unit" @select="$emit('select', $event)" />
      </div>
    </div>
  </div>
</template>
