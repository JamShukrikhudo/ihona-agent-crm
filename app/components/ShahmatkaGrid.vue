<script setup lang="ts">
const store = useUnitsStore()

const emit = defineEmits<{ select: [id: number] }>()

// Sorted descending (top floor first) — matches how a real building's
// floor plan reads, and how the earlier Filament/Livewire chessboard plan
// (now abandoned in favor of this app) described the same grid.
const floors = computed(() => [...store.byFloor.entries()].sort(([a], [b]) => b - a))
</script>

<template>
  <div v-if="store.loading" class="p-8 text-center text-slate-500">Загрузка шахматки…</div>

  <div v-else-if="floors.length === 0" class="p-8 text-center text-slate-500">В этом проекте пока нет юнитов.</div>

  <div v-else class="space-y-3">
    <div v-for="[floorNumber, units] in floors" :key="floorNumber" class="flex items-center gap-4">
      <span class="w-12 shrink-0 text-right text-sm font-medium text-slate-500 dark:text-slate-400">{{ floorNumber }} эт.</span>
      <div class="grid flex-1 grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
        <UnitCell v-for="unit in units" :key="unit.id" :unit="unit" @select="emit('select', $event)" />
      </div>
    </div>
  </div>
</template>
