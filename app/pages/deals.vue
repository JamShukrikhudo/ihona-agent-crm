<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { LEAD_SOURCES, SOURCE_LABEL } from '~/utils/leadSources'

definePageMeta({ middleware: 'sales-manager' })

const auth = useAuthStore()
const store = useLeadsStore()

const formOpen = ref(false)
const contactName = ref('')
const contactPhone = ref('')
const source = ref(LEAD_SOURCES[1]) // 'call' — the most common manual entry point

const conversion = computed(() => (store.leads.length === 0 ? 0 : Math.round((store.byStage.get('contracted')!.length / store.leads.length) * 100)))

const TERMINAL = new Set(['contracted', 'lost'])
const pipelineValue = computed(() =>
  store.leads.filter((l) => !TERMINAL.has(l.stage)).reduce((sum, l) => sum + (l.unitPrice ?? 0), 0),
)
const contractedCount = computed(() => store.byStage.get('contracted')?.length ?? 0)
const avgDealSize = computed(() => {
  const priced = store.leads.filter((l) => l.unitPrice)
  return priced.length === 0 ? 0 : Math.round(priced.reduce((sum, l) => sum + (l.unitPrice ?? 0), 0) / priced.length)
})
function formatTjs(n: number): string {
  return `${n.toLocaleString('ru-RU')} TJS`
}

async function submitLead() {
  if (contactName.value.trim() === '') {
    return
  }
  await store.createLead({ contact_name: contactName.value.trim(), contact_phone: contactPhone.value.trim() || undefined, source: source.value })
  contactName.value = ''
  contactPhone.value = ''
  formOpen.value = false
}

onMounted(() => {
  if (auth.user?.teamId == null) {
    return
  }

  // Same reasoning as the chessboard's own subscription: a teammate moving
  // a card in their own browser should repaint this board without a
  // reload.
  useEcho().private(`team.${auth.user.teamId}.leads`).listen('.lead.stage-changed', (payload: { leadId: number; to: string }) => {
    store.patchLead(payload.leadId, { stage: payload.to as import('~/stores/useLeadsStore').LeadStage })
  })
})

onBeforeUnmount(() => {
  if (auth.user?.teamId != null) {
    useEcho().leave(`team.${auth.user.teamId}.leads`)
  }
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Воронка сделок</div>
          <h1 class="font-display text-xl font-bold text-ink">{{ store.leads.length }} сделок в работе</h1>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-36">
            <div class="mb-1 flex items-center justify-between text-[11px] text-ink-soft">
              <span>Конверсия в договор</span>
              <b class="text-brand-dark">{{ conversion }}%</b>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-paper">
              <div class="h-full rounded-full bg-brand-600" :style="{ width: `${conversion}%` }" />
            </div>
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            @click="formOpen = !formOpen"
          >
            <Plus :size="14" /> Новый лид
          </button>
        </div>
      </div>

      <form v-if="formOpen" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-paper p-3" @submit.prevent="submitLead">
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Имя контакта
          <input v-model="contactName" type="text" required class="w-48 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Телефон
          <input v-model="contactPhone" type="text" class="w-40 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Источник
          <select v-model="source" class="w-40 rounded-lg border border-line px-2 py-1.5 text-sm text-ink">
            <option v-for="s in LEAD_SOURCES" :key="s" :value="s">{{ SOURCE_LABEL[s] }}</option>
          </select>
        </label>
        <button type="submit" class="rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700">
          Добавить
        </button>
      </form>
    </div>

    <div class="px-6 pt-6">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Сумма в работе</div>
          <div class="font-display text-lg font-bold text-ink">{{ formatTjs(pipelineValue) }}</div>
        </div>
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Договоров заключено</div>
          <div class="font-display text-lg font-bold text-ink">{{ contractedCount }}</div>
        </div>
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Средний чек</div>
          <div class="font-display text-lg font-bold text-ink">{{ formatTjs(avgDealSize) }}</div>
        </div>
      </div>
    </div>

    <div class="px-6 py-6">
      <DealsBoard />
    </div>
  </div>
</template>
