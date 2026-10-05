<script setup lang="ts">
import type { Conversation } from '~/stores/useInboxStore'
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
const SOURCE_HEX: Record<string, string> = { phone: '#0284c7', referral: '#b45309', site: '#2e7d5c', instagram: '#db2777' }
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

// Omnichannel widget: channel connection status (manager-only — same
// role gate as /settings/broadcasts, since that's what these statuses
// come from) and unread count across the unified Inbox (any team
// member — same access as /inbox itself).
const CHANNEL_META = {
  telegram: { label: 'Telegram', icon: 'i-lucide-send', to: '/settings/telegram' },
  whatsapp: { label: 'WhatsApp', icon: 'i-lucide-message-circle', to: '/settings/meta' },
  instagram: { label: 'Instagram', icon: 'i-lucide-camera', to: '/settings/meta' },
} as const
type InboxChannelKey = keyof typeof CHANNEL_META
const channelStatus = reactive<Record<InboxChannelKey, { loading: boolean; connected: boolean }>>({
  telegram: { loading: true, connected: false },
  whatsapp: { loading: true, connected: false },
  instagram: { loading: true, connected: false },
})

const inboxConversations = ref<Conversation[]>([])
const inboxUnread = computed(() => inboxConversations.value.reduce((sum, c) => sum + c.unreadCount, 0))
const loadingInbox = ref(true)

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

    for (const channel of Object.keys(CHANNEL_META) as InboxChannelKey[]) {
      apiFetch<{ data: { connected: boolean } }>(`/broadcasts/${channel}/status`)
        .then((res) => {
          channelStatus[channel].connected = res.data.connected
        })
        .finally(() => {
          channelStatus[channel].loading = false
        })
    }
  }

  loadingInbox.value = true
  apiFetch<{ data: Conversation[] }>('/inbox/conversations')
    .then((res) => (inboxConversations.value = res.data))
    .finally(() => {
      loadingInbox.value = false
    })
})

onBeforeUnmount(() => disconnectEcho())
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-light bg-surface px-6 py-4">
      <div>
        <div class="text-[11px] font-medium text-medium-emphasis">Кабинет агента</div>
        <h1 class="font-display text-xl font-bold">Здравствуйте, {{ auth.user?.name }}</h1>
      </div>
      <VChip :color="echoState === 'connected' ? 'success' : 'default'" variant="tonal" size="small">
        <VIcon start size="8" icon="mdi-circle" />
        Реалтайм: {{ echoState === 'connected' ? 'подключено' : echoState }}
      </VChip>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <VCard v-if="isManager">
        <VCardText class="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 class="font-display text-xl font-bold">Здравствуйте, {{ auth.user?.name }}</h2>
            <p class="mt-1 max-w-sm text-[13px] text-medium-emphasis">Коротко о том, что сейчас происходит в воронке и задачах команды.</p>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <VAvatar color="primary" variant="tonal" size="36"><VIcon icon="mdi-clipboard-check-outline" size="18" /></VAvatar>
              <div>
                <div class="font-display text-[15px] font-bold">{{ upcomingTasks.length }} задач</div>
                <div class="text-[11px] text-medium-emphasis">В ближайшее время</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <VAvatar color="info" variant="tonal" size="36"><VIcon icon="mdi-account-group-outline" size="18" /></VAvatar>
              <div>
                <div class="font-display text-[15px] font-bold">{{ leadSourceTotal }} лидов</div>
                <div class="text-[11px] text-medium-emphasis">В работе</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <VAvatar color="secondary" variant="tonal" size="36"><VIcon icon="mdi-file-check-outline" size="18" /></VAvatar>
              <div>
                <div class="font-display text-[15px] font-bold">{{ monthly.at(-1)?.contracts_signed ?? 0 }} договоров</div>
                <div class="text-[11px] text-medium-emphasis">Подписано в этом месяце</div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard>
        <VCardTitle class="flex items-center justify-between">
          <span class="font-display text-sm font-bold">Омниканал</span>
          <VBtn to="/inbox" prepend-icon="mdi-inbox-outline" variant="text" size="small" color="primary">
            Входящие{{ inboxUnread > 0 ? ` (${inboxUnread})` : '' }}
          </VBtn>
        </VCardTitle>
        <VCardText class="flex flex-wrap gap-2">
          <template v-if="isManager">
            <div v-if="Object.values(channelStatus).some((s) => s.loading)" class="flex gap-2">
              <VSkeleton v-for="n in 3" :key="n" type="chip" width="112" />
            </div>
            <template v-else>
              <VBtn
                v-for="(meta, key) in CHANNEL_META"
                :key="key"
                :to="meta.to"
                :prepend-icon="meta.icon"
                :color="channelStatus[key].connected ? 'success' : 'default'"
                :variant="channelStatus[key].connected ? 'tonal' : 'outlined'"
                size="small"
                rounded="pill"
              >
                {{ meta.label }}
              </VBtn>
            </template>
          </template>
          <div v-if="loadingInbox" class="h-8 w-28"><VSkeleton type="chip" /></div>
          <div v-else-if="inboxUnread === 0" class="flex items-center px-1 text-[12px] text-medium-emphasis">Непрочитанных сообщений нет.</div>
        </VCardText>
      </VCard>

      <VRow v-if="isManager && stats" dense>
        <VCol cols="12" sm="4">
          <VCard variant="tonal" color="primary">
            <VCardText>
              <VIcon icon="mdi-wallet-outline" class="mb-2" />
              <div class="text-2xl font-semibold">{{ stats.collected.toLocaleString('ru-RU') }} TJS</div>
              <div class="mt-1 text-[12px] opacity-80">остаток {{ stats.remaining.toLocaleString('ru-RU') }}</div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" sm="4">
          <VCard variant="tonal" color="info">
            <VCardText>
              <VIcon icon="mdi-trending-up" class="mb-2" />
              <div class="text-2xl font-semibold">{{ stats.sold_units }} / {{ stats.total_units }}</div>
              <div class="mt-1 text-[12px] opacity-80">Юнитов продано</div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" sm="4">
          <VCard variant="tonal" :color="stats.overdue_installments_count > 0 ? 'error' : 'primary'">
            <VCardText>
              <VIcon icon="mdi-alert-outline" class="mb-2" />
              <div class="text-2xl font-semibold">{{ stats.overdue_installments_count }}</div>
              <div class="mt-1 text-[12px] opacity-80">Просрочено платежей</div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VRow v-if="isManager && monthly.length > 0" dense>
        <VCol cols="12" md="6">
          <VCard>
            <VCardTitle class="font-display text-sm font-bold">Собрано по месяцам</VCardTitle>
            <VCardText>
              <div class="flex h-28 items-end gap-2">
                <div v-for="m in monthly" :key="m.month" class="group relative flex-1">
                  <div
                    class="mx-auto w-full rounded-t bg-primary"
                    :class="{ 'bg-surface-light': m.collected === 0 }"
                    :style="{ height: `${Math.max(4, (m.collected / monthlyMax) * 100)}px` }"
                  />
                  <div class="mt-1 text-center text-[10px] text-medium-emphasis">{{ m.month }}</div>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard>
            <VCardTitle class="font-display text-sm font-bold">Договоров подписано</VCardTitle>
            <VCardText>
              <LineChart :points="monthly.map((m) => ({ label: m.month, value: m.contracts_signed }))" />
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VRow v-if="isManager" dense>
        <VCol v-if="leadSourceSegments.length > 0" cols="12" md="6">
          <VCard>
            <VCardText class="flex items-center gap-4">
              <MultiDonutChart :segments="leadSourceSegments" />
              <div class="min-w-0 flex-1 space-y-1.5">
                <h2 class="mb-1 font-display text-sm font-bold">Источники лидов</h2>
                <div v-for="segment in leadSourceSegments" :key="segment.label" class="flex items-center justify-between gap-2 text-[12px]">
                  <span class="flex items-center gap-1.5 text-medium-emphasis">
                    <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: segment.color }" /> {{ segment.label }}
                  </span>
                  <span class="font-semibold">{{ Math.round((segment.value / leadSourceTotal) * 100) }}%</span>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol v-if="topAgents.length > 0" cols="12" md="6">
          <VCard>
            <VCardTitle class="font-display text-sm font-bold">Топ агентов</VCardTitle>
            <VCardText class="space-y-2.5">
              <div v-for="agent in topAgents" :key="agent.agent_id" class="flex items-center gap-3">
                <AgentAvatar :name="agent.agent_name" :size="28" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[13px] font-semibold">{{ agent.agent_name }}</div>
                  <div class="text-[11px] text-medium-emphasis">{{ agent.contracts_signed }} договор(ов)</div>
                </div>
                <div class="text-[13px] font-semibold">{{ agent.revenue.toLocaleString('ru-RU') }} TJS</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <section v-if="isManager && upcomingTasks.length > 0">
        <h2 class="mb-3 font-display text-sm font-bold">Ближайшие задачи</h2>
        <VCard>
          <VList density="comfortable">
            <VListItem v-for="{ lead, task } in upcomingTasks" :key="`${lead.id}-${task.title}`">
              <template #prepend>
                <VIcon icon="mdi-clock-outline" size="16" :color="task.overdue ? 'error' : undefined" />
              </template>
              <VListItemTitle class="text-[13px] font-semibold">{{ task.title }}</VListItemTitle>
              <VListItemSubtitle class="text-[11px]">{{ lead.contactName }}</VListItemSubtitle>
              <template #append>
                <span class="text-[11px] font-semibold" :class="task.overdue ? 'text-error' : 'text-medium-emphasis'">
                  {{ task.dueAt ? new Date(task.dueAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—' }}
                </span>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </section>

      <section>
        <h2 class="mb-3 font-display text-sm font-bold">Проекты</h2>

        <VRow v-if="loadingProjects" dense>
          <VCol v-for="n in 2" :key="n" cols="12" sm="6"><VSkeleton type="article" /></VCol>
        </VRow>
        <div v-else-if="projects.length === 0" class="text-sm text-medium-emphasis">Пока нет ни одного проекта.</div>

        <VRow v-else dense>
          <VCol v-for="project in projects" :key="project.id" cols="12" sm="6">
            <VCard :to="`/projects/${project.id}`" variant="outlined" hover>
              <VCardText class="flex items-center gap-4">
                <DonutChart :value="project.sold" :total="project.total" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 font-display text-sm font-bold">
                    <VIcon icon="mdi-office-building-outline" size="14" /> {{ project.name }}
                  </div>
                  <div class="mt-1 text-[12px] text-medium-emphasis">Продано {{ project.sold }} из {{ project.total }}</div>
                  <div class="text-[12px] font-semibold">{{ project.revenue.toLocaleString('ru-RU') }} TJS</div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <section v-if="isManager">
        <h2 class="mb-3 font-display text-sm font-bold">Лиды за последние 14 дней</h2>
        <VCard>
          <VCardText>
            <LeadsTrendChart :leads="leadsStore.leads" />
          </VCardText>
        </VCard>
      </section>

      <section v-if="isManager">
        <h2 class="mb-3 font-display text-sm font-bold">Воронка по всем сделкам</h2>
        <VCard>
          <VCardText class="space-y-2">
            <div v-for="stage in LEAD_STAGES" :key="stage" class="flex items-center gap-3">
              <span class="flex w-36 shrink-0 items-center gap-1.5 text-[12px] text-medium-emphasis">
                <component :is="STAGE_ICON[stage]" :size="12" />
                {{ LEAD_STAGE_LABEL[stage] }}
              </span>
              <VProgressLinear
                :model-value="((funnelCounts.get(stage) ?? 0) / funnelMax) * 100"
                :color="stage === 'lost' ? 'error' : 'primary'"
                height="8"
                rounded
              />
              <span class="w-6 shrink-0 text-right text-[12px] font-semibold">{{ funnelCounts.get(stage) ?? 0 }}</span>
            </div>
          </VCardText>
        </VCard>
      </section>
    </div>
  </div>
</template>
