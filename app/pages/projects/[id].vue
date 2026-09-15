<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import type { UnitStatus } from '~/stores/useUnitsStore'

definePageMeta({ middleware: 'agent' })

const route = useRoute()
const projectId = computed(() => Number(route.params.id))

const store = useUnitsStore()
const auth = useAuthStore()
const selectedUnitId = ref<number | null>(null)
const section = ref<string | null>(null)
const statusFilter = ref<UnitStatus | null>(null)
const projectName = ref<string | null>(null)

const searchQuery = ref('')
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)
const areaMin = ref<number | null>(null)
const areaMax = ref<number | null>(null)
const filtersOpen = ref(false)

const visibleUnits = computed(() =>
  store.units
    .filter((u) => section.value === null || u.section === section.value)
    .filter((u) => statusFilter.value === null || u.status === statusFilter.value)
    .filter((u) => searchQuery.value.trim() === '' || u.label.toLowerCase().includes(searchQuery.value.trim().toLowerCase()))
    .filter((u) => priceMin.value === null || u.price >= priceMin.value)
    .filter((u) => priceMax.value === null || u.price <= priceMax.value)
    .filter((u) => areaMin.value === null || u.area >= areaMin.value)
    .filter((u) => areaMax.value === null || u.area <= areaMax.value),
)

function resetRangeFilters() {
  searchQuery.value = ''
  priceMin.value = null
  priceMax.value = null
  areaMin.value = null
  areaMax.value = null
}

onMounted(async () => {
  const [project] = await Promise.all([
    apiFetch<{ data: { name: string } }>(`/projects/${projectId.value}`).catch(() => null),
    store.fetchUnits(projectId.value),
  ])
  projectName.value = project?.data.name ?? null
  section.value = store.sections[0] ?? null

  if (auth.user?.teamId == null) {
    return
  }

  // Sprint 1's actual point: a status change made anywhere (another
  // agent's browser, a tinker/seeder update on the backend) repaints this
  // grid without a reload. Scoped to the team, not the project, because
  // that's the real channel UnitStatusChanged broadcasts on — every
  // project a team owns shares one channel, so units belonging to a
  // different project are simply ignored here (fetchUnits already scoped
  // the list to this project; a patch for a unit not in it is a no-op).
  useEcho().private(`team.${auth.user.teamId}.units`).listen('.unit.status-changed', (payload: {
    unitId: number
    to: string
    reservedBy: string | null
    expiresInHours: number | null
  }) => {
    store.patchUnit(payload.unitId, {
      status: payload.to as UnitStatus,
      agent: payload.reservedBy,
      expiresInHours: payload.expiresInHours,
    })
  })
})

onBeforeUnmount(() => {
  if (auth.user?.teamId != null) {
    useEcho().leave(`team.${auth.user.teamId}.units`)
  }
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Шахматка проекта</div>
          <h1 class="font-display text-xl font-bold text-ink">{{ projectName ?? `Проект #${projectId}` }}</h1>
        </div>
        <div v-if="store.sections.length > 1" class="flex items-center gap-2 rounded-full bg-paper p-1">
          <button
            v-for="sec in store.sections"
            :key="sec"
            type="button"
            class="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            :class="section === sec ? 'bg-brand-600 text-white' : 'text-ink-soft'"
            @click="section = sec"
          >
            {{ sec }}
          </button>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="(label, key) in STATUS_LABEL"
          :key="key"
          type="button"
          class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors"
          :class="statusFilter === key ? [STATUS_BORDER[key], STATUS_BG_SOFT[key]] : 'border-line'"
          @click="statusFilter = statusFilter === key ? null : (key as UnitStatus)"
        >
          <span class="h-2 w-2 rounded-full" :class="STATUS_BG[key]" />
          {{ label }} <b>{{ store.counts[key] }}</b>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors"
          :class="filtersOpen ? [STATUS_BORDER.reserved, STATUS_BG_SOFT.reserved] : 'border-line'"
          @click="filtersOpen = !filtersOpen"
        >
          <SlidersHorizontal :size="13" /> Ещё фильтры
        </button>

        <div class="ml-auto rounded-full bg-brand-dark px-3 py-1.5 text-[12px] font-medium text-white">
          Продано на {{ store.revenue.toLocaleString('ru-RU') }} TJS
        </div>
      </div>

      <div v-if="filtersOpen" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-paper p-3">
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Поиск по номеру
          <input v-model="searchQuery" type="text" placeholder="A-9C" class="w-32 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Цена от
          <input v-model.number="priceMin" type="number" min="0" class="w-28 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Цена до
          <input v-model.number="priceMax" type="number" min="0" class="w-28 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Площадь от, м²
          <input v-model.number="areaMin" type="number" min="0" class="w-24 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Площадь до, м²
          <input v-model.number="areaMax" type="number" min="0" class="w-24 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-soft hover:bg-slate-50" @click="resetRangeFilters">
          Сбросить
        </button>
      </div>
    </div>

    <div class="px-6 py-6">
      <ShahmatkaGrid :units="visibleUnits" :loading="store.loading" @select="selectedUnitId = $event" />
    </div>

    <UnitPanel :unit-id="selectedUnitId" @close="selectedUnitId = null" />
  </div>
</template>
