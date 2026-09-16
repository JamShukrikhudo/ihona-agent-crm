<script setup lang="ts">
import { MessageCircle, Phone, Send, StickyNote } from '@lucide/vue'
import { STATUS_BG_SOFT, STATUS_BORDER, STATUS_LABEL } from '~/utils/statusStyles'
import type { UnitStatus } from '~/stores/useUnitsStore'
import type { Client, ClientInteraction } from '~/stores/useClientsStore'

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
const interactions = ref<ClientInteraction[]>([])
const loading = ref(true)

const NOTE_TYPES = [
  { value: 'note', label: 'Заметка', icon: StickyNote },
  { value: 'call', label: 'Звонок', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
] as const
const noteType = ref<(typeof NOTE_TYPES)[number]['value']>('call')
const noteMessage = ref('')
const savingNote = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await clientsStore.fetchHistory(clientId.value)
    client.value = res.client
    units.value = res.units as ClientUnit[]
    interactions.value = res.interactions
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
    await load()
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
      <h1 v-if="client" class="font-display text-xl font-bold text-ink">{{ client.name }}</h1>
    </div>

    <div v-if="loading" class="px-6 py-6 text-sm text-ink-soft">Загрузка…</div>

    <div v-else-if="client" class="mx-auto grid max-w-4xl gap-6 px-6 py-6 sm:grid-cols-[1fr_1.4fr]">
      <div class="space-y-4">
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Телефон</div>
          <div class="text-sm font-medium text-ink">{{ client.phone }}</div>
          <div v-if="client.email" class="mt-2 text-[11px] text-ink-soft">Email</div>
          <div v-if="client.email" class="text-sm font-medium text-ink">{{ client.email }}</div>
        </div>

        <div class="rounded-xl border border-line bg-card p-4">
          <div class="mb-2 font-display text-sm font-bold text-ink">Юниты</div>
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

      <div class="rounded-xl border border-line bg-card p-4">
        <div class="mb-3 font-display text-sm font-bold text-ink">История</div>
        <ClientTimeline :interactions="interactions" />
      </div>
    </div>
  </div>
</template>
