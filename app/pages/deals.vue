<script setup lang="ts">
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

const submittingLead = ref(false)

async function submitLead() {
  if (contactName.value.trim() === '') {
    return
  }
  submittingLead.value = true
  try {
    await store.createLead({ contact_name: contactName.value.trim(), contact_phone: contactPhone.value.trim() || undefined, source: source.value })
    contactName.value = ''
    contactPhone.value = ''
    formOpen.value = false
  } catch {
    useToastStore().push('Не удалось добавить лид', 'error')
  } finally {
    submittingLead.value = false
  }
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
          <UButton icon="i-lucide-plus" @click="formOpen = !formOpen">Новый лид</UButton>
        </div>
      </div>

      <form v-if="formOpen" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-paper p-3" @submit.prevent="submitLead">
        <UFormField label="Имя контакта">
          <UInput v-model="contactName" required class="w-48" />
        </UFormField>
        <UFormField label="Телефон">
          <UInput v-model="contactPhone" class="w-40" />
        </UFormField>
        <UFormField label="Источник">
          <USelect v-model="source" :items="LEAD_SOURCES.map((s) => ({ label: SOURCE_LABEL[s], value: s }))" class="w-40" />
        </UFormField>
        <UButton type="submit" :loading="submittingLead">Добавить</UButton>
      </form>
    </div>

    <div class="px-6 pt-6">
      <UPageGrid class="gap-4 sm:grid-cols-3 sm:gap-6 lg:gap-px">
        <UPageCard
          icon="i-lucide-wallet"
          title="Сумма в работе"
          variant="subtle"
          :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase' }"
          class="sm:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
        >
          <span class="text-2xl font-semibold text-highlighted">{{ formatTjs(pipelineValue) }}</span>
        </UPageCard>
        <UPageCard
          icon="i-lucide-file-signature"
          title="Договоров заключено"
          variant="subtle"
          :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase' }"
          class="sm:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
        >
          <span class="text-2xl font-semibold text-highlighted">{{ contractedCount }}</span>
        </UPageCard>
        <UPageCard
          icon="i-lucide-trending-up"
          title="Средний чек"
          variant="subtle"
          :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase' }"
          class="sm:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
        >
          <span class="text-2xl font-semibold text-highlighted">{{ formatTjs(avgDealSize) }}</span>
        </UPageCard>
      </UPageGrid>
    </div>

    <div class="px-6 py-6">
      <DealsBoard @add-lead="formOpen = true" />
    </div>
  </div>
</template>
