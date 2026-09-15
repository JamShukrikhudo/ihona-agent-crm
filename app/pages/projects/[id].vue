<script setup lang="ts">
import type { UnitStatus } from '~/stores/useUnitsStore'

definePageMeta({ middleware: 'agent' })

const route = useRoute()
const projectId = computed(() => Number(route.params.id))

const store = useUnitsStore()
const auth = useAuthStore()
const selectedUnitId = ref<number | null>(null)

onMounted(async () => {
  await store.fetchUnits(projectId.value)

  if (auth.user?.teamId == null) {
    return
  }

  // Sprint 1's actual point: a status change made anywhere (another
  // agent's browser, a tinker/seeder update on the backend) repaints this
  // grid without a reload. Scoped to the team, not the project, because
  // that's the real channel UnitStatusChanged broadcasts on — every
  // project a team owns shares one channel, so units belonging to a
  // different project are simply ignored below.
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
  <div class="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
    <div class="mx-auto max-w-5xl">
      <h1 class="mb-6 font-display text-2xl font-semibold text-brand-800">Шахматка проекта #{{ projectId }}</h1>
      <ShahmatkaGrid @select="selectedUnitId = $event" />
    </div>

    <UnitPanel :unit-id="selectedUnitId" @close="selectedUnitId = null" />
  </div>
</template>
