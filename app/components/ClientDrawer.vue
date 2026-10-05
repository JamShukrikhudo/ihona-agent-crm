<script setup lang="ts">
import { Camera, MessageCircle, Phone, Send, StickyNote } from '@lucide/vue'
import { STATUS_BG_SOFT, STATUS_BORDER, STATUS_LABEL } from '~/utils/statusStyles'
import type { UnitStatus } from '~/stores/useUnitsStore'
import type { Client, ClientInteraction, TeamAgent } from '~/stores/useClientsStore'
import { LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import type { Lead } from '~/stores/useLeadsStore'

interface ClientUnit {
  id: number
  label: string
  section: string
  floor: number
  status: UnitStatus
}

const props = defineProps<{ clientId: number }>()
const emit = defineEmits<{ close: [] }>()

const clientsStore = useClientsStore()

const client = ref<Client | null>(null)
const units = ref<ClientUnit[]>([])
const leads = ref<Lead[]>([])
const interactions = ref<ClientInteraction[]>([])
const channels = ref<string[]>([])
const loading = ref(true)

const teamAgents = ref<TeamAgent[]>([])
const savingInfo = ref(false)
onMounted(() => {
  clientsStore.fetchTeamAgents().then((agents) => { teamAgents.value = agents })
})

async function updateAssignedAgent(agentId: string) {
  if (!client.value) return
  savingInfo.value = true
  try {
    client.value = await clientsStore.updateClient(client.value.id, { assigned_agent_id: agentId === 'none' ? null : Number(agentId) })
  } catch {
    useToastStore().push('Не удалось сохранить менеджера', 'error')
  } finally {
    savingInfo.value = false
  }
}

async function updateRegion(region: string) {
  if (!client.value) return
  savingInfo.value = true
  try {
    client.value = await clientsStore.updateClient(client.value.id, { region: region.trim() === '' ? null : region.trim() })
  } catch {
    useToastStore().push('Не удалось сохранить регион', 'error')
  } finally {
    savingInfo.value = false
  }
}

// Right panel: live/loggable messenger channels only (the omnichannel
// chat), separate from the "События" tab's call/note log — matches the
// reference's split between a message thread and an activity tab. All
// three are now real sends (see useClientsStore's sendXMessage methods),
// gated on the client actually having a linked chat for that channel —
// none of the three let you message someone who hasn't written first.
const CHAT_CHANNELS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
] as const
const activeChatChannel = ref<(typeof CHAT_CHANNELS)[number]['value']>('telegram')
const hasActiveChannel = computed(() => channels.value.includes(activeChatChannel.value))

const SEND_METHOD = {
  telegram: (id: number, msg: string) => clientsStore.sendTelegramMessage(id, msg),
  whatsapp: (id: number, msg: string) => clientsStore.sendWhatsAppMessage(id, msg),
  instagram: (id: number, msg: string) => clientsStore.sendInstagramMessage(id, msg),
} as const

const chatInteractions = computed(() => interactions.value.filter((i) => i.type === activeChatChannel.value))
const eventInteractions = computed(() => interactions.value.filter((i) => i.type === 'note' || i.type === 'call'))

const chatMessage = ref('')
const sendingChat = ref(false)

async function sendChatMessage() {
  if (chatMessage.value.trim() === '') {
    return
  }
  sendingChat.value = true
  try {
    await SEND_METHOD[activeChatChannel.value](props.clientId, chatMessage.value.trim())
    chatMessage.value = ''
    await load(true)
  } catch {
    useToastStore().push('Не удалось отправить сообщение', 'error')
  } finally {
    sendingChat.value = false
  }
}

// A 5s poll while this drawer is open — a customer's reply should show up
// without the agent having to manually refresh. Real-time via the Reverb
// broadcasting already used for the kanban board is a natural fast-follow,
// deliberately not done here to keep this change scoped.
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollTimer = setInterval(() => {
    if (channels.value.length > 0) {
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
  { value: 'events', label: 'События' },
  { value: 'deals', label: 'Сделки' },
  { value: 'units', label: 'Юниты' },
] as const
const activeTab = ref<(typeof TABS)[number]['value']>('info')

const NOTE_TYPES = [
  { value: 'note', label: 'Заметка', icon: StickyNote },
  { value: 'call', label: 'Звонок', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'telegram', label: 'Telegram', icon: Send },
] as const
const noteType = ref<(typeof NOTE_TYPES)[number]['value']>('call')
const noteMessage = ref('')
const savingNote = ref(false)

/** silent=true skips the full drawer loading flash — used by the poll and
 * after sending/logging a message, where the drawer is already open. */
async function load(silent = false) {
  if (!silent) {
    loading.value = true
  }
  try {
    const res = await clientsStore.fetchHistory(props.clientId)
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
    await clientsStore.addInteraction(props.clientId, noteType.value, noteMessage.value.trim())
    noteMessage.value = ''
    await load(true)
  } catch {
    useToastStore().push('Не удалось сохранить', 'error')
  } finally {
    savingNote.value = false
  }
}

watch(() => props.clientId, () => load(), { immediate: true })

function copyLink() {
  const url = `${window.location.origin}/clients/${props.clientId}`
  navigator.clipboard.writeText(url).then(
    () => useToastStore().push('Ссылка скопирована', 'success'),
    () => useToastStore().push('Не удалось скопировать ссылку', 'error'),
  )
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6" @click.self="emit('close')">
    <div class="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl sm:h-[92vh]">
      <div class="flex items-center justify-between border-b border-line bg-card px-5 py-3">
        <div class="flex items-center gap-3">
          <UButton icon="i-lucide-x" color="neutral" variant="outline" @click="emit('close')" />
          <AgentAvatar v-if="client" :name="client.name" :size="34" />
          <div v-if="client">
            <div class="text-[10.5px] text-ink-soft">Клиент</div>
            <div class="font-display text-[15px] font-bold text-ink">{{ client.name }} <span class="font-sans text-[11px] font-normal text-ink-soft">ID: {{ clientId }}</span></div>
          </div>
        </div>
        <UButton color="neutral" variant="outline" class="rounded-full" @click="copyLink">
          Скопировать ссылку
        </UButton>
      </div>

      <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-ink-soft">Загрузка…</div>

      <div v-else-if="client" class="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden sm:grid-cols-[1fr_1.1fr]">
        <div class="min-h-0 space-y-4 overflow-y-auto p-5">
          <div class="flex gap-1 rounded-xl border border-line bg-card p-1">
            <UButton
              v-for="t in TABS"
              :key="t.value"
              :color="activeTab === t.value ? 'primary' : 'neutral'"
              :variant="activeTab === t.value ? 'solid' : 'ghost'"
              size="sm"
              block
              class="flex-1 justify-center"
              @click="activeTab = t.value"
            >
              {{ t.label }}
              <UBadge
                v-if="t.value === 'events' && eventInteractions.length > 0"
                :color="activeTab === t.value ? 'neutral' : 'neutral'"
                :variant="activeTab === t.value ? 'solid' : 'soft'"
                size="sm"
                class="rounded-full"
              >{{ eventInteractions.length }}</UBadge>
              <UBadge
                v-if="t.value === 'deals' && leads.length > 0"
                :variant="activeTab === t.value ? 'solid' : 'soft'"
                size="sm"
                class="rounded-full"
              >{{ leads.length }}</UBadge>
              <UBadge
                v-if="t.value === 'units' && units.length > 0"
                :variant="activeTab === t.value ? 'solid' : 'soft'"
                size="sm"
                class="rounded-full"
              >{{ units.length }}</UBadge>
            </UButton>
          </div>

          <div v-if="activeTab === 'info'" class="rounded-xl border border-line bg-card p-4">
            <div class="text-[11px] text-ink-soft">Телефон</div>
            <div class="text-sm font-medium text-ink">{{ client.phone }}</div>
            <div v-if="client.email" class="mt-2 text-[11px] text-ink-soft">Email</div>
            <div v-if="client.email" class="text-sm font-medium text-ink">{{ client.email }}</div>
            <div v-if="client.notes" class="mt-2 text-[11px] text-ink-soft">Заметка</div>
            <div v-if="client.notes" class="text-sm text-ink">{{ client.notes }}</div>

            <div class="mt-3 text-[11px] text-ink-soft">Менеджер</div>
            <USelect
              :model-value="client.assignedAgentId ? String(client.assignedAgentId) : 'none'"
              :disabled="savingInfo"
              :items="[{ label: 'Не назначен', value: 'none' }, ...teamAgents.map((a) => ({ label: a.name, value: String(a.id) }))]"
              class="w-full"
              @update:model-value="updateAssignedAgent($event as string)"
            />

            <div class="mt-3 text-[11px] text-ink-soft">Регион</div>
            <UInput
              :model-value="client.region ?? ''"
              placeholder="Например, Душанбе"
              :disabled="savingInfo"
              class="w-full"
              @change="updateRegion(($event.target as HTMLInputElement).value)"
            />
          </div>

          <div v-if="activeTab === 'events'" class="space-y-4">
            <div class="rounded-xl border border-line bg-card p-4">
              <ClientTimeline :interactions="eventInteractions" />
            </div>
            <form class="space-y-2 rounded-xl border border-line bg-card p-4" @submit.prevent="submitNote">
              <div class="font-display text-sm font-bold text-ink">Записать контакт</div>
              <div class="flex flex-wrap gap-1.5">
                <UButton
                  v-for="t in NOTE_TYPES"
                  :key="t.value"
                  :color="noteType === t.value ? 'primary' : 'neutral'"
                  :variant="noteType === t.value ? 'subtle' : 'outline'"
                  size="xs"
                  @click="noteType = t.value"
                >
                  <component :is="t.icon" :size="12" /> {{ t.label }}
                </UButton>
              </div>
              <UTextarea v-model="noteMessage" :rows="3" placeholder="Что обсудили?" class="w-full" />
              <UButton type="submit" :loading="savingNote" :disabled="noteMessage.trim() === ''" block>
                Сохранить
              </UButton>
            </form>
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
        </div>

        <div class="flex min-h-0 flex-col border-t border-line bg-card sm:border-l sm:border-t-0">
          <div class="flex gap-1 overflow-x-auto border-b border-line p-2">
            <UButton
              v-for="ch in CHAT_CHANNELS"
              :key="ch.value"
              :color="activeChatChannel === ch.value ? 'primary' : 'neutral'"
              :variant="activeChatChannel === ch.value ? 'solid' : 'ghost'"
              size="sm"
              class="rounded-full"
              @click="activeChatChannel = ch.value"
            >
              {{ ch.label }}
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="channels.includes(ch.value) ? 'bg-status-free' : 'bg-ink-soft/40'"
              />
            </UButton>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <ClientTimeline :interactions="chatInteractions" />
            <p v-if="chatInteractions.length === 0" class="text-[12px] text-ink-soft">Нет сообщений в этом канале.</p>
          </div>

          <!-- Real send-and-deliver compose box — only once the client has
               a linked chat on this channel (they messaged first), which
               all three platforms require. -->
          <form v-if="hasActiveChannel" class="flex gap-2 border-t border-line p-3" @submit.prevent="sendChatMessage">
            <UInput v-model="chatMessage" placeholder="Написать сообщение…" class="flex-1" />
            <UButton type="submit" :loading="sendingChat" :disabled="chatMessage.trim() === ''">
              Отправить
            </UButton>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
