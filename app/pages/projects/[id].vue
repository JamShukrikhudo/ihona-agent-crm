<script setup lang="ts">
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
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <NuxtLink to="/" class="text-[11px] font-medium text-medium-emphasis hover:text-primary">← Все проекты</NuxtLink>
          <h1 class="font-display text-xl font-bold">{{ projectName ?? `Проект #${projectId}` }}</h1>
        </div>
        <div v-if="store.sections.length > 1" class="flex items-center gap-1 rounded-full bg-surface-light p-1">
          <VBtn
            v-for="sec in store.sections"
            :key="sec"
            :color="section === sec ? 'primary' : 'default'"
            :variant="section === sec ? 'flat' : 'text'"
            size="small"
            rounded="pill"
            @click="section = sec"
          >
            {{ sec }}
          </VBtn>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <VBtn
          v-for="(label, key) in STATUS_LABEL"
          :key="key"
          color="default"
          variant="outlined"
          size="small"
          rounded="pill"
          :class="statusFilter === key ? [STATUS_BORDER[key], STATUS_BG_SOFT[key]] : ''"
          @click="statusFilter = statusFilter === key ? null : (key as UnitStatus)"
        >
          <span class="mr-1.5 h-2 w-2 rounded-full" :class="STATUS_BG[key]" />
          {{ label }} <b class="ml-1">{{ store.counts[key] }}</b>
        </VBtn>

        <VBtn
          prepend-icon="mdi-tune-variant"
          :color="filtersOpen ? 'warning' : 'default'"
          :variant="filtersOpen ? 'tonal' : 'outlined'"
          size="small"
          rounded="pill"
          @click="filtersOpen = !filtersOpen"
        >
          Ещё фильтры
        </VBtn>

        <div class="ml-auto rounded-full bg-secondary px-3 py-1.5 text-[12px] font-medium text-white">
          Продано на {{ store.revenue.toLocaleString('ru-RU') }} TJS
        </div>
      </div>

      <div v-if="filtersOpen" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-surface-light p-3">
        <VTextField v-model="searchQuery" label="Поиск по номеру" placeholder="A-9C" hide-details density="compact" style="width: 128px" />
        <VTextField v-model.number="priceMin" label="Цена от" type="number" :min="0" hide-details density="compact" style="width: 112px" />
        <VTextField v-model.number="priceMax" label="Цена до" type="number" :min="0" hide-details density="compact" style="width: 112px" />
        <VTextField v-model.number="areaMin" label="Площадь от, м²" type="number" :min="0" hide-details density="compact" style="width: 96px" />
        <VTextField v-model.number="areaMax" label="Площадь до, м²" type="number" :min="0" hide-details density="compact" style="width: 96px" />
        <VBtn variant="outlined" @click="resetRangeFilters">Сбросить</VBtn>
      </div>
    </div>

    <div class="px-6 py-6">
      <ShahmatkaGrid :units="visibleUnits" :loading="store.loading" @select="selectedUnitId = $event" />
    </div>

    <UnitPanel :unit-id="selectedUnitId" @close="selectedUnitId = null" />
  </div>
</template>
