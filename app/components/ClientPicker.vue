<script setup lang="ts">
import { UserPlus } from '@lucide/vue'
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
    <VCard class="w-full max-w-sm">
      <VCardText class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display text-sm font-bold">Клиент для брони</h3>
          <VBtn icon="mdi-close" color="default" variant="text" size="small" @click="emit('cancel')" />
        </div>

        <VTextField v-model="query" prepend-inner-icon="mdi-magnify" autofocus placeholder="Телефон или имя" hide-details />

        <div v-if="searching" class="text-[12px] text-medium-emphasis">Ищу…</div>

        <div v-else-if="results.length > 0" class="max-h-48 space-y-1 overflow-y-auto">
          <VBtn
            v-for="client in results"
            :key="client.id"
            color="default"
            variant="outlined"
            block
            class="flex-col items-start py-2"
            @click="emit('select', client)"
          >
            <span class="w-full text-left text-[13px] font-semibold">{{ client.name }}</span>
            <span class="w-full text-left text-[11px] text-medium-emphasis">{{ client.phone }}</span>
          </VBtn>
        </div>

        <div v-else-if="showCreateForm" class="space-y-2 rounded-lg bg-surface-light p-3">
          <div class="flex items-center gap-1.5 text-[12px] font-medium text-medium-emphasis">
            <UserPlus :size="13" /> Такого клиента ещё нет — создать нового
          </div>
          <VTextField v-model="newName" placeholder="Имя клиента" hide-details />
          <VBtn color="primary" :loading="creating" :disabled="newName.trim() === ''" block @click="createClient">
            Создать и выбрать
          </VBtn>
        </div>

        <p v-else-if="query.trim() !== ''" class="text-[12px] text-medium-emphasis">Введите телефон, чтобы найти или создать клиента.</p>
      </VCardText>
    </VCard>
  </div>
</template>
