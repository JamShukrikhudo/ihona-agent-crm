<script setup lang="ts">
import { ChevronRight, MessageCircle, Search, Send } from '@lucide/vue'
import type { Client } from '~/stores/useClientsStore'
import { SOURCE_BG, SOURCE_ICON, SOURCE_TEXT, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'

const CHANNEL_ICON: Record<string, typeof Send> = {
  telegram: Send,
  whatsapp: MessageCircle,
}
const CHANNEL_LABEL: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}
function clientSource(client: Client): LeadSource | null {
  return client.source && client.source in SOURCE_ICON ? (client.source as LeadSource) : null
}

definePageMeta({ middleware: 'agent' })

const query = ref('')
const clients = ref<Client[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const isPhoneLike = /\d/.test(query.value)
    const params = query.value.trim() === '' ? {} : isPhoneLike ? { phone: query.value } : { q: query.value }
    const res = await apiFetch<{ data: Client[] }>('/clients', { params })
    // Newest-created first is the closest proxy to "last activity" the
    // index endpoint currently supports — a real last-activity sort would
    // need it to join client_interactions, not worth it before this list
    // has more than a handful of clients.
    clients.value = [...res.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(query, () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(load, 250)
})

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Клиенты</div>
          <h1 class="font-display text-xl font-bold text-ink">Все клиенты</h1>
        </div>
        <div class="relative w-64">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            v-model="query"
            type="text"
            placeholder="Поиск по имени или телефону"
            class="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
          />
        </div>
      </div>
    </div>

    <div class="px-6 py-6">
      <div v-if="loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else-if="clients.length === 0" class="text-sm text-ink-soft">Клиенты не найдены.</div>

      <div v-else class="overflow-hidden rounded-2xl border border-line bg-card">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-line bg-paper">
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Клиент</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Канал</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Источник</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Дата</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in clients" :key="client.id" class="border-b border-line last:border-b-0 hover:bg-paper">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <AgentAvatar :name="client.name" :size="32" />
                  <div class="min-w-0">
                    <div class="truncate text-[13px] font-semibold text-ink">{{ client.name }}</div>
                    <div class="text-[11px] text-ink-soft">{{ client.phone }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <template v-for="ch in client.channels ?? []" :key="ch">
                    <span
                      v-if="CHANNEL_ICON[ch]"
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-brand-600"
                      :title="CHANNEL_LABEL[ch]"
                    >
                      <component :is="CHANNEL_ICON[ch]" :size="13" />
                    </span>
                  </template>
                  <span v-if="!client.channels?.length" class="text-[11px] text-ink-soft">—</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="clientSource(client)"
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="[SOURCE_BG[clientSource(client)!], SOURCE_TEXT[clientSource(client)!]]"
                >
                  <component :is="SOURCE_ICON[clientSource(client)!]" :size="11" /> {{ sourceLabel(client.source) }}
                </span>
                <span v-else class="text-[11px] text-ink-soft">—</span>
              </td>
              <td class="px-4 py-3 text-[12px] text-ink-soft">{{ new Date(client.createdAt).toLocaleDateString('ru-RU') }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/clients/${client.id}`"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-brand-600"
                  title="Открыть карточку"
                >
                  <ChevronRight :size="16" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
