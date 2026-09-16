<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Client } from '~/stores/useClientsStore'

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
      <div class="text-[11px] font-medium text-ink-soft">Клиенты</div>
      <h1 class="font-display text-xl font-bold text-ink">Все клиенты</h1>
      <div class="relative mt-3 max-w-xs">
        <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          v-model="query"
          type="text"
          placeholder="Поиск по имени или телефону"
          class="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <div v-if="loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else-if="clients.length === 0" class="text-sm text-ink-soft">Клиенты не найдены.</div>

      <div v-else class="overflow-hidden rounded-xl border border-line bg-card">
        <NuxtLink
          v-for="client in clients"
          :key="client.id"
          :to="`/clients/${client.id}`"
          class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0 hover:bg-paper"
        >
          <div>
            <div class="text-[13px] font-semibold text-ink">{{ client.name }}</div>
            <div class="text-[11px] text-ink-soft">{{ client.phone }}</div>
          </div>
          <div class="text-[11px] text-ink-soft">{{ new Date(client.createdAt).toLocaleDateString('ru-RU') }}</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
