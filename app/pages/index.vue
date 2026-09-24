<script setup lang="ts">
import { Building2, Wallet, TrendingUp, AlertTriangle, Clock } from '@lucide/vue'
import { LEAD_STAGES, LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import { STAGE_ICON } from '~/utils/leadStageIcons'
import { LEAD_SOURCES, sourceLabel } from '~/utils/leadSources'

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

interface SalesStats {
  total_units: number
  sold_units: number
  total_contract_value: number
  collected: number
  remaining: number
  overdue_installments_count: number
}

const stats = ref<SalesStats | null>(null)

interface MonthlyPoint {
  month: string
  contracts_signed: number
  collected: number
}

const monthly = ref<MonthlyPoint[]>([])
const monthlyMax = computed(() => Math.max(1, ...monthly.value.map((m) => m.collected)))

const leadSourceCounts = ref<Record<string, number>>({})
// Same hex values as utils/leadSources.ts's Tailwind classes — the donut
// draws raw SVG strokes, which can't resolve a Tailwind class at runtime.
const SOURCE_HEX: Record<string, string> = { site: '#2e7d5c', call: '#0284c7', visit: '#b45309', telegram: '#0891b2' }
const leadSourceSegments = computed(() =>
  LEAD_SOURCES.map((source) => ({ label: sourceLabel(source), value: leadSourceCounts.value[source] ?? 0, color: SOURCE_HEX[source]! })).filter(
    (s) => s.value > 0,
  ),
)
const leadSourceTotal = computed(() => leadSourceSegments.value.reduce((sum, s) => sum + s.value, 0))

interface TopAgent {
  agent_id: number
  agent_name: string
  contracts_signed: number
  revenue: number
}

const topAgents = ref<TopAgent[]>([])

const upcomingTasks = computed(() =>
  leadsStore.leads
    .filter((lead) => lead.nextTask !== null)
    .map((lead) => ({ lead, task: lead.nextTask! }))
    .sort((a, b) => (a.task.dueAt && b.task.dueAt ? new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime() : 0))
    .slice(0, 5),
)

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

  // Sold count and revenue come pre-aggregated from the API (grouped SQL,
  // not a client-side reduce over every unit of every project) — see
  // ProjectController::index.
  loadingProjects.value = true
  try {
    const res = await apiFetch<{ data: ProjectSummary[] }>('/projects')
    projects.value = res.data
  } finally {
    loadingProjects.value = false
  }

  if (isManager.value) {
    apiFetch<{ data: SalesStats }>('/sales-stats').then((res) => (stats.value = res.data))
    apiFetch<{ data: MonthlyPoint[] }>('/sales-stats/monthly').then((res) => (monthly.value = res.data))
    apiFetch<{ data: Record<string, number> }>('/sales-stats/lead-sources').then((res) => (leadSourceCounts.value = res.data))
    apiFetch<{ data: TopAgent[] }>('/sales-stats/top-agents').then((res) => (topAgents.value = res.data))
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
        <div class="flex items-center gap-2 text-[12px] text-ink-soft">
          <span class="h-2 w-2 rounded-full" :class="echoState === 'connected' ? 'bg-status-free' : 'bg-status-reserved'" />
          Реалтайм: {{ echoState === 'connected' ? 'подключено' : echoState }}
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <!-- Three accent tiles instead of bordered-white cards — matches the
           "color carries the headline numbers" pattern from the Spike
           Admin reference the team asked to follow (docs/CRM spec), kept
           in our own brand palette rather than copying its blue. -->
      <section v-if="isManager && stats" class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-brand-600 p-4 text-white">
          <Wallet :size="18" class="mb-2 opacity-80" />
          <div class="font-display text-xl font-bold">{{ stats.collected.toLocaleString('ru-RU') }} TJS</div>
          <div class="text-[11px] opacity-80">Собрано · остаток {{ stats.remaining.toLocaleString('ru-RU') }}</div>
        </div>
        <div class="rounded-xl bg-brand-700 p-4 text-white">
          <TrendingUp :size="18" class="mb-2 opacity-80" />
          <div class="font-display text-xl font-bold">{{ stats.sold_units }} / {{ stats.total_units }}</div>
          <div class="text-[11px] opacity-80">Юнитов продано</div>
        </div>
        <div class="rounded-xl p-4 text-white" :class="stats.overdue_installments_count > 0 ? 'bg-status-deposit' : 'bg-brand-800'">
          <AlertTriangle :size="18" class="mb-2 opacity-80" />
          <div class="font-display text-xl font-bold">{{ stats.overdue_installments_count }}</div>
          <div class="text-[11px] opacity-80">Просрочено платежей</div>
        </div>
      </section>

      <!-- Profit & Expenses / Product Sales, side by side like the
           reference — sourced from sales-stats/monthly (6 months). -->
      <section v-if="isManager && monthly.length > 0" class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-line bg-card p-4">
          <h2 class="mb-3 font-display text-sm font-bold text-ink">Собрано по месяцам</h2>
          <div class="flex h-28 items-end gap-2">
            <div v-for="m in monthly" :key="m.month" class="group relative flex-1">
              <div
                class="mx-auto w-full rounded-t bg-brand-600"
                :class="{ 'bg-line': m.collected === 0 }"
                :style="{ height: `${Math.max(4, (m.collected / monthlyMax) * 100)}px` }"
              />
              <div class="mt-1 text-center text-[10px] text-ink-soft">{{ m.month }}</div>
              <div
                class="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block"
              >
                {{ m.collected.toLocaleString('ru-RU') }} TJS
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-line bg-card p-4">
          <h2 class="mb-3 font-display text-sm font-bold text-ink">Договоров подписано</h2>
          <LineChart :points="monthly.map((m) => ({ label: m.month, value: m.contracts_signed }))" />
        </div>
      </section>

      <!-- Traffic Distribution -> lead sources; Top Employees -> top agents. -->
      <section v-if="isManager" class="grid gap-4 lg:grid-cols-2">
        <div v-if="leadSourceSegments.length > 0" class="flex items-center gap-4 rounded-xl border border-line bg-card p-4">
          <MultiDonutChart :segments="leadSourceSegments" />
          <div class="min-w-0 flex-1 space-y-1.5">
            <h2 class="mb-1 font-display text-sm font-bold text-ink">Источники лидов</h2>
            <div v-for="segment in leadSourceSegments" :key="segment.label" class="flex items-center justify-between gap-2 text-[12px]">
              <span class="flex items-center gap-1.5 text-ink-soft">
                <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: segment.color }" /> {{ segment.label }}
              </span>
              <span class="font-semibold text-ink">{{ Math.round((segment.value / leadSourceTotal) * 100) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="topAgents.length > 0" class="rounded-xl border border-line bg-card p-4">
          <h2 class="mb-3 font-display text-sm font-bold text-ink">Топ агентов</h2>
          <div class="space-y-2.5">
            <div v-for="agent in topAgents" :key="agent.agent_id" class="flex items-center gap-3">
              <AgentAvatar :name="agent.agent_name" :size="28" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-[13px] font-semibold text-ink">{{ agent.agent_name }}</div>
                <div class="text-[11px] text-ink-soft">{{ agent.contracts_signed }} договор(ов)</div>
              </div>
              <div class="text-[13px] font-semibold text-ink">{{ agent.revenue.toLocaleString('ru-RU') }} TJS</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Upcoming Schedules -> nearest lead tasks (calls, viewings). -->
      <section v-if="isManager && upcomingTasks.length > 0">
        <h2 class="mb-3 font-display text-sm font-bold text-ink">Ближайшие задачи</h2>
        <div class="overflow-hidden rounded-xl border border-line bg-card">
          <div v-for="{ lead, task } in upcomingTasks" :key="`${lead.id}-${task.title}`" class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <Clock :size="14" :class="task.overdue ? 'text-status-deposit' : 'text-ink-soft'" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[13px] font-semibold text-ink">{{ task.title }}</div>
              <div class="text-[11px] text-ink-soft">{{ lead.contactName }}</div>
            </div>
            <div class="text-[11px] font-semibold" :class="task.overdue ? 'text-status-deposit' : 'text-ink-soft'">
              {{ task.dueAt ? new Date(task.dueAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—' }}
            </div>
          </div>
        </div>
      </section>

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
            class="flex items-center gap-4 rounded-xl border border-line bg-card p-4 transition-shadow hover:shadow-md"
          >
            <DonutChart :value="project.sold" :total="project.total" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 font-display text-sm font-bold text-ink">
                <Building2 :size="14" /> {{ project.name }}
              </div>
              <div class="mt-1 text-[12px] text-ink-soft">Продано {{ project.sold }} из {{ project.total }}</div>
              <div class="text-[12px] font-semibold text-ink">{{ project.revenue.toLocaleString('ru-RU') }} TJS</div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section v-if="isManager">
        <h2 class="mb-3 font-display text-sm font-bold text-ink">Лиды за последние 14 дней</h2>
        <div class="rounded-xl border border-line bg-card p-4">
          <LeadsTrendChart :leads="leadsStore.leads" />
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
