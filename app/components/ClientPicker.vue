<script setup lang="ts">
import { Search, UserPlus, X } from '@lucide/vue'
import type { Client } from '~/stores/useClientsStore'

const emit = defineEmits<{ select: [client: Client]; cancel: [] }>()

const clientsStore = useClientsStore()
const query = ref('')
const results = ref<Client[]>([])
const searching = ref(false)
const newName = ref('')
const creating = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  if (value.trim() === '') {
    results.value = []
    return
  }
  // 250ms, not a request per keystroke — an agent typing a phone number
  // fires this a dozen times before they're done.
  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      results.value = await clientsStore.search(value)
    } finally {
      searching.value = false
    }
  }, 250)
})

const looksLikePhone = computed(() => /\d{4,}/.test(query.value))
const showCreateForm = computed(() => looksLikePhone.value && !searching.value && results.value.length === 0)

async function createClient() {
  if (newName.value.trim() === '') {
    return
  }
  creating.value = true
  try {
    const client = await clientsStore.findOrCreateByPhone(query.value.trim(), newName.value.trim())
    emit('select', client)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="emit('cancel')">
    <div class="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-display text-sm font-bold text-ink">Клиент для брони</h3>
        <button type="button" class="text-ink-soft hover:text-ink" @click="emit('cancel')">
          <X :size="16" />
        </button>
      </div>

      <div class="relative">
        <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          v-model="query"
          type="text"
          autofocus
          placeholder="Телефон или имя"
          class="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
      </div>

      <div v-if="searching" class="text-[12px] text-ink-soft">Ищу…</div>

      <div v-else-if="results.length > 0" class="max-h-48 space-y-1 overflow-y-auto">
        <button
          v-for="client in results"
          :key="client.id"
          type="button"
          class="flex w-full flex-col items-start rounded-lg border border-line px-3 py-2 text-left hover:border-brand-600 hover:bg-brand-50"
          @click="emit('select', client)"
        >
          <span class="text-[13px] font-semibold text-ink">{{ client.name }}</span>
          <span class="text-[11px] text-ink-soft">{{ client.phone }}</span>
        </button>
      </div>

      <div v-else-if="showCreateForm" class="space-y-2 rounded-lg bg-paper p-3">
        <div class="flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
          <UserPlus :size="13" /> Такого клиента ещё нет — создать нового
        </div>
        <input
          v-model="newName"
          type="text"
          placeholder="Имя клиента"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
        <button
          type="button"
          :disabled="creating || newName.trim() === ''"
          class="w-full rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          @click="createClient"
        >
          {{ creating ? 'Создаю…' : `Создать и выбрать` }}
        </button>
      </div>

      <p v-else-if="query.trim() !== ''" class="text-[12px] text-ink-soft">Введите телефон, чтобы найти или создать клиента.</p>
    </div>
  </div>
</template>
