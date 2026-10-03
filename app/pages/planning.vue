<script setup lang="ts">
definePageMeta({ middleware: 'sales-manager' })

interface ManagerPlanRow {
  id: number | null
  agentId: number
  agentName: string | null
  period: string
  status: 'active' | 'closed'
  leadsTarget: number
  dealsTarget: number
  callsTarget: number
  eventsTarget: number
  leadsFact: number
  dealsFact: number
  callsFact: number
  eventsFact: number
}

const toast = useToastStore()

const cursor = ref(new Date())
const period = computed(() => `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`)
const periodLabel = computed(() => cursor.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }))

const rows = ref<ManagerPlanRow[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await apiFetch<{ data: ManagerPlanRow[] }>('/manager-plans', { params: { period: period.value } })
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

watch(period, load)
onMounted(load)

function shiftMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

function pct(fact: number, target: number | null | undefined): number {
  return !target ? 0 : Math.round((fact / target) * 100)
}

// Only a target already reached shows solid green — an empty target
// (nothing planned yet) is a neutral state, not a false 100%.
function pctClass(fact: number, target: number | null | undefined): string {
  if (!target) {
    return 'text-ink-soft'
  }
  return fact >= target ? 'text-status-free' : 'text-ink'
}

const saving = ref<number | null>(null)
async function saveTarget(row: ManagerPlanRow, field: 'leadsTarget' | 'dealsTarget' | 'callsTarget' | 'eventsTarget' | 'status', value: number | string) {
  saving.value = row.agentId
  const body: Record<string, unknown> = { agent_id: row.agentId, period: row.period }
  const apiField = { leadsTarget: 'leads_target', dealsTarget: 'deals_target', callsTarget: 'calls_target', eventsTarget: 'events_target', status: 'status' }[field]
  body[apiField] = value
  try {
    const res = await apiFetch<{ data: ManagerPlanRow }>('/manager-plans', { method: 'POST', body })
    const idx = rows.value.findIndex((r) => r.agentId === row.agentId)
    if (idx !== -1) {
      rows.value[idx] = res.data
    }
  } catch {
    toast.push('Не удалось сохранить план', 'error')
  } finally {
    saving.value = null
  }
}

const METRICS = [
  { key: 'leads', label: 'Лиды', targetField: 'leadsTarget' as const },
  { key: 'deals', label: 'Сделки', targetField: 'dealsTarget' as const },
  { key: 'calls', label: 'Звонки', targetField: 'callsTarget' as const },
  { key: 'events', label: 'События', targetField: 'eventsTarget' as const },
] as const
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Планирование</div>
          <h1 class="font-display text-xl font-bold capitalize text-ink">{{ periodLabel }}</h1>
        </div>
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" @click="shiftMonth(-1)" />
          <UButton color="primary" variant="soft" @click="cursor = new Date()">Текущий месяц</UButton>
          <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" @click="shiftMonth(1)" />
        </div>
      </div>
    </div>

    <div class="px-6 py-6">
      <div v-if="loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else-if="rows.length === 0" class="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-ink-soft">
        В команде пока нет ни одного агента.
      </div>

      <div v-else class="space-y-3">
        <UCard v-for="row in rows" :key="row.agentId">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <AgentAvatar :name="row.agentName ?? '—'" :size="30" />
              <span class="font-display text-[14px] font-bold text-ink">{{ row.agentName }}</span>
            </div>
            <USelect
              :model-value="row.status"
              :disabled="saving === row.agentId"
              :items="[{ label: 'В работе', value: 'active' }, { label: 'Закрыт', value: 'closed' }]"
              size="sm"
              @update:model-value="saveTarget(row, 'status', $event as string)"
            />
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <UCard v-for="m in METRICS" :key="m.key" :ui="{ body: 'p-3 sm:p-3' }">
              <div class="text-[11px] text-ink-soft">{{ m.label }}</div>
              <div class="mt-1 flex items-baseline gap-1.5">
                <span class="text-[18px] font-bold text-ink">{{ row[`${m.key}Fact` as const] }}</span>
                <span class="text-[12px] text-ink-soft">/</span>
                <UInput
                  type="number"
                  :min="0"
                  :model-value="row[m.targetField]"
                  :disabled="saving === row.agentId"
                  size="xs"
                  class="w-16"
                  @change="saveTarget(row, m.targetField, Number(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div class="mt-1 text-[11px] font-semibold" :class="pctClass(row[`${m.key}Fact` as const], row[m.targetField])">
                {{ pct(row[`${m.key}Fact` as const], row[m.targetField]) }}%
              </div>
            </UCard>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
