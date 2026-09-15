<script setup lang="ts">
import { LogOut, Building2 } from '@lucide/vue'
import type { Unit } from '~/stores/useUnitsStore'
import { LEAD_STAGES, LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import { STAGE_ICON } from '~/utils/leadStageIcons'

definePageMeta({ middleware: 'agent' })

const auth = useAuthStore()
const leadsStore = useLeadsStore()
const echoState = ref('connecting…')

interface ProjectSummary {
  id: number
  name: string
  total: number
  sold: number
  revenue: number
}

const projects = ref<ProjectSummary[]>([])
const loadingProjects = ref(true)
const isManager = computed(() => auth.hasRole('sales-manager') || auth.hasRole('developer-admin'))

const funnelCounts = computed(() => {
  const counts = new Map(LEAD_STAGES.map((stage) => [stage, 0]))
  for (const lead of leadsStore.leads) {
    counts.set(lead.stage, (counts.get(lead.stage) ?? 0) + 1)
  }
  return counts
})
const funnelMax = computed(() => Math.max(1, ...funnelCounts.value.values()))

onMounted(async () => {
  const echo = useEcho()
  const pusher = echo.connector.pusher

  pusher.connection.bind('state_change', (states: { current: string }) => {
    echoState.value = states.current
  })
  echoState.value = pusher.connection.state

  // A team's project list doubles as the switcher (below) and the source
  // for these per-project mini stats — fetched in parallel rather than
  // through useUnitsStore, which only ever holds one active project at a
  // time (the chessboard page's own concern).
  loadingProjects.value = true
  try {
    const list = await apiFetch<{ data: { id: number; name: string }[] }>('/projects')
    projects.value = await Promise.all(
      list.data.map(async (project) => {
        const units = await apiFetch<{ data: Unit[] }>(`/projects/${project.id}/units`).catch(() => ({ data: [] as Unit[] }))
        const sold = units.data.filter((u) => u.status === 'sold')
        return {
          id: project.id,
          name: project.name,
          total: units.data.length,
          sold: sold.length,
          revenue: sold.reduce((sum, u) => sum + u.price, 0),
        }
      }),
    )
  } finally {
    loadingProjects.value = false
  }

  if (isManager.value) {
    await leadsStore.fetchLeads()
  }
})

onBeforeUnmount(() => disconnectEcho())
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Кабинет агента</div>
          <h1 class="font-display text-xl font-bold text-ink">Здравствуйте, {{ auth.user?.name }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-[12px] text-ink-soft">
            <span class="h-2 w-2 rounded-full" :class="echoState === 'connected' ? 'bg-status-free' : 'bg-status-reserved'" />
            Реалтайм: {{ echoState === 'connected' ? 'подключено' : echoState }}
          </div>
          <NuxtLink
            v-if="isManager"
            to="/deals"
            class="rounded-full border border-brand-600 px-4 py-1.5 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
          >
            Воронка сделок
          </NuxtLink>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper"
            @click="auth.logout().then(() => navigateTo('/login'))"
          >
            <LogOut :size="14" /> Выйти
          </button>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <section>
        <h2 class="mb-3 font-display text-sm font-bold text-ink">Проекты</h2>

        <div v-if="loadingProjects" class="grid gap-3 sm:grid-cols-2">
          <div v-for="n in 2" :key="n" class="h-[86px] animate-pulse rounded-xl border border-line bg-card p-4">
            <div class="h-4 w-1/2 rounded bg-paper" />
            <div class="mt-3 h-2 w-full rounded bg-paper" />
          </div>
        </div>
        <div v-else-if="projects.length === 0" class="text-sm text-ink-soft">Пока нет ни одного проекта.</div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="project in projects"
            :key="project.id"
            :to="`/projects/${project.id}`"
            class="block rounded-xl border border-line bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div class="flex items-center gap-2 font-display text-sm font-bold text-ink">
              <Building2 :size="14" /> {{ project.name }}
            </div>
            <div class="mt-2 flex items-center justify-between text-[12px] text-ink-soft">
              <span>Продано {{ project.sold }} из {{ project.total }}</span>
              <span>{{ project.revenue.toLocaleString('ru-RU') }} TJS</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
              <div
                class="h-full rounded-full bg-brand-600"
                :style="{ width: `${project.total > 0 ? (project.sold / project.total) * 100 : 0}%` }"
              />
            </div>
          </NuxtLink>
        </div>
      </section>

      <section v-if="isManager">
        <h2 class="mb-3 font-display text-sm font-bold text-ink">Воронка по всем сделкам</h2>
        <div class="space-y-2 rounded-xl border border-line bg-card p-4">
          <div v-for="stage in LEAD_STAGES" :key="stage" class="flex items-center gap-3">
            <span class="flex w-36 shrink-0 items-center gap-1.5 text-[12px] text-ink-soft">
              <component :is="STAGE_ICON[stage]" :size="12" />
              {{ LEAD_STAGE_LABEL[stage] }}
            </span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-paper">
              <div
                class="h-full rounded-full"
                :class="stage === 'lost' ? 'bg-status-sold' : 'bg-brand-600'"
                :style="{ width: `${((funnelCounts.get(stage) ?? 0) / funnelMax) * 100}%` }"
              />
            </div>
            <span class="w-6 shrink-0 text-right text-[12px] font-semibold text-ink">{{ funnelCounts.get(stage) ?? 0 }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
