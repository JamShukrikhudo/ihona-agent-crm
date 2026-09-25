<script setup lang="ts">
import { MessageCircle, Phone, Send, StickyNote } from '@lucide/vue'
import { STATUS_BG_SOFT, STATUS_BORDER, STATUS_LABEL } from '~/utils/statusStyles'
import type { UnitStatus } from '~/stores/useUnitsStore'
import type { Client, ClientInteraction } from '~/stores/useClientsStore'
import { LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import type { Lead } from '~/stores/useLeadsStore'

definePageMeta({ middleware: 'agent' })

interface ClientUnit {
  id: number
  label: string
  section: string
  floor: number
  status: UnitStatus
}

const route = useRoute()
const clientId = computed(() => Number(route.params.id))
const clientsStore = useClientsStore()

const client = ref<Client | null>(null)
const units = ref<ClientUnit[]>([])
const leads = ref<Lead[]>([])
const interactions = ref<ClientInteraction[]>([])
const channels = ref<string[]>([])
const loading = ref(true)

const hasTelegram = computed(() => channels.value.includes('telegram'))
const chatMessage = ref('')
const sendingChat = ref(false)

async function sendChatMessage() {
  if (chatMessage.value.trim() === '') {
    return
  }
  sendingChat.value = true
  try {
    await clientsStore.sendTelegramMessage(clientId.value, chatMessage.value.trim())
    chatMessage.value = ''
    await load(true)
  } catch {
    useToastStore().push('Не удалось отправить сообщение', 'error')
  } finally {
    sendingChat.value = false
  }
}

// A 5s poll while this page is open — a customer's reply should show up
// without the agent having to manually refresh. Real-time via the Reverb
// broadcasting already used for the kanban board is a natural fast-follow,
// deliberately not done here to keep this change scoped.
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollTimer = setInterval(() => {
    if (hasTelegram.value) {
      load(true)
    }
  }, 5000)
})
onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})

const TABS = [
  { value: 'info', label: 'Информация' },
  { value: 'deals', label: 'Сделки' },
  { value: 'units', label: 'Юниты' },
] as const
const activeTab = ref<(typeof TABS)[number]['value']>('info')

const NOTE_TYPES = [
  { value: 'note', label: 'Заметка', icon: StickyNote },
  { value: 'call', label: 'Звонок', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
] as const
const noteType = ref<(typeof NOTE_TYPES)[number]['value']>('call')
const noteMessage = ref('')
const savingNote = ref(false)

/** silent=true skips the full-page loading flash — used by the poll and
 * after sending/logging a message, where the page is already visible. */
async function load(silent = false) {
  if (!silent) {
    loading.value = true
  }
  try {
    const res = await clientsStore.fetchHistory(clientId.value)
    client.value = res.client
    units.value = res.units as ClientUnit[]
    leads.value = res.leads
    interactions.value = res.interactions
    channels.value = res.channels
  } finally {
    loading.value = false
  }
}

async function submitNote() {
  if (noteMessage.value.trim() === '') {
    return
  }
  savingNote.value = true
  try {
    await clientsStore.addInteraction(clientId.value, noteType.value, noteMessage.value.trim())
    noteMessage.value = ''
    await load(true)
  } finally {
    savingNote.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <NuxtLink to="/clients" class="text-[11px] font-medium text-ink-soft hover:text-brand-600">← Все клиенты</NuxtLink>
      <div v-if="client" class="mt-1 flex items-center gap-3">
        <AgentAvatar :name="client.name" :size="40" />
        <h1 class="font-display text-xl font-bold text-ink">{{ client.name }}</h1>
      </div>
    </div>

    <div v-if="loading" class="px-6 py-6 text-sm text-ink-soft">Загрузка…</div>

    <div v-else-if="client" class="mx-auto grid max-w-4xl gap-6 px-6 py-6 sm:grid-cols-[1fr_1.4fr]">
      <div class="space-y-4">
        <div class="flex gap-1 rounded-xl border border-line bg-card p-1">
          <button
            v-for="t in TABS"
            :key="t.value"
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold"
            :class="activeTab === t.value ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-paper'"
            @click="activeTab = t.value"
          >
            {{ t.label }}
            <span
              v-if="t.value === 'deals' && leads.length > 0"
              class="rounded-full px-1.5 text-[10px]"
              :class="activeTab === t.value ? 'bg-white/20' : 'bg-paper'"
            >{{ leads.length }}</span>
            <span
              v-if="t.value === 'units' && units.length > 0"
              class="rounded-full px-1.5 text-[10px]"
              :class="activeTab === t.value ? 'bg-white/20' : 'bg-paper'"
            >{{ units.length }}</span>
          </button>
        </div>

        <div v-if="activeTab === 'info'" class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Телефон</div>
          <div class="text-sm font-medium text-ink">{{ client.phone }}</div>
          <div v-if="client.email" class="mt-2 text-[11px] text-ink-soft">Email</div>
          <div v-if="client.email" class="text-sm font-medium text-ink">{{ client.email }}</div>
        </div>

        <div v-if="activeTab === 'deals'" class="rounded-xl border border-line bg-card p-4">
          <p v-if="leads.length === 0" class="text-[12px] text-ink-soft">У клиента пока нет сделок.</p>
          <div v-else class="space-y-2">
            <NuxtLink
              v-for="lead in leads"
              :key="lead.id"
              to="/deals"
              class="block rounded-lg border border-line px-3 py-2 text-[12px] hover:bg-paper"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-ink">{{ lead.unitLabel ?? lead.buildingName ?? `Сделка №${lead.id}` }}</span>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="lead.stage === 'lost' ? 'bg-status-deposit-soft text-status-deposit' : 'bg-brand-50 text-brand-dark'"
                >
                  {{ LEAD_STAGE_LABEL[lead.stage] }}
                </span>
              </div>
              <div class="mt-1 flex items-center justify-between text-ink-soft">
                <span>{{ lead.agent ?? '—' }}</span>
                <span>{{ lead.unitPrice ? `${lead.unitPrice.toLocaleString('ru-RU')} TJS` : '—' }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <div v-if="activeTab === 'units'" class="rounded-xl border border-line bg-card p-4">
          <p v-if="units.length === 0" class="text-[12px] text-ink-soft">Пока не интересовался ни одним юнитом.</p>
          <div v-else class="space-y-2">
            <div
              v-for="unit in units"
              :key="unit.id"
              class="flex items-center justify-between rounded-lg border px-3 py-2 text-[12px]"
              :class="[STATUS_BORDER[unit.status], STATUS_BG_SOFT[unit.status]]"
            >
              <span class="font-semibold text-ink">{{ unit.section }}, {{ unit.label }}</span>
              <span class="text-ink-soft">{{ STATUS_LABEL[unit.status] }}</span>
            </div>
          </div>
        </div>

        <form class="space-y-2 rounded-xl border border-line bg-card p-4" @submit.prevent="submitNote">
          <div class="font-display text-sm font-bold text-ink">Записать контакт</div>
          <div class="flex gap-1.5">
            <button
              v-for="t in NOTE_TYPES"
              :key="t.value"
              type="button"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-medium"
              :class="noteType === t.value ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft'"
              @click="noteType = t.value"
            >
              <component :is="t.icon" :size="12" /> {{ t.label }}
            </button>
          </div>
          <textarea
            v-model="noteMessage"
            rows="3"
            placeholder="Что обсудили?"
            class="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink"
          />
          <button
            type="submit"
            :disabled="savingNote || noteMessage.trim() === ''"
            class="w-full rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {{ savingNote ? 'Сохраняю…' : 'Сохранить' }}
          </button>
        </form>
      </div>

      <div class="flex flex-col rounded-xl border border-line bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="font-display text-sm font-bold text-ink">История</span>
          <span v-if="hasTelegram" class="flex items-center gap-1 text-[11px] font-semibold text-brand-600">
            <span class="h-1.5 w-1.5 rounded-full bg-brand-600" /> Telegram подключён
          </span>
        </div>
        <ClientTimeline :interactions="interactions" />

        <!-- Real send-and-deliver compose box, distinct from "Записать
             контакт" above — only shown when this client actually has a
             linked Telegram chat, not just a manually-typed note. -->
        <form v-if="hasTelegram" class="mt-3 flex gap-2 border-t border-line pt-3" @submit.prevent="sendChatMessage">
          <input
            v-model="chatMessage"
            type="text"
            placeholder="Написать в Telegram…"
            class="flex-1 rounded-lg border border-line px-3 py-2 text-[13px] text-ink"
          />
          <button
            type="submit"
            :disabled="sendingChat || chatMessage.trim() === ''"
            class="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
