<script setup lang="ts">
import { MessageCircle, Unlink } from '@lucide/vue'

// Replaces the Filament-only TelegramSettings page (see docs/CRM spec) —
// same behavior: opt a team into unit/lead notifications by linking a
// chat_id. No chat_id linked means no messages send.
definePageMeta({ middleware: 'sales-manager' })

const chatId = ref<string | null>(null)
const input = ref('')
const loading = ref(true)
const saving = ref(false)

onMounted(async () => {
  try {
    const res = await apiFetch<{ data: { chat_id: string | null } }>('/telegram-setting')
    chatId.value = res.data.chat_id
    input.value = res.data.chat_id ?? ''
  } finally {
    loading.value = false
  }
})

async function save() {
  if (input.value.trim() === '') {
    return
  }
  saving.value = true
  try {
    const res = await apiFetch<{ data: { chat_id: string | null } }>('/telegram-setting', {
      method: 'POST',
      body: { chat_id: input.value.trim() },
    })
    chatId.value = res.data.chat_id
    useToastStore().push('Чат подключён', 'success')
  } catch {
    useToastStore().push('Не удалось сохранить chat_id', 'error')
  } finally {
    saving.value = false
  }
}

async function disconnect() {
  saving.value = true
  try {
    await apiFetch('/telegram-setting', { method: 'DELETE' })
    chatId.value = null
    input.value = ''
    useToastStore().push('Чат отключён', 'success')
  } catch {
    useToastStore().push('Не удалось отключить чат', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Настройки</div>
      <h1 class="font-display text-xl font-bold text-ink">Telegram-уведомления</h1>
    </div>

    <div class="mx-auto max-w-lg px-6 py-8">
      <div v-if="loading" class="h-32 animate-pulse rounded-2xl border border-line bg-card" />

      <div v-else class="rounded-2xl border border-line bg-card p-5">
        <div class="mb-4 flex items-center gap-2">
          <MessageCircle :size="16" class="text-brand-600" />
          <span class="font-display text-sm font-bold text-ink">Чат для уведомлений</span>
        </div>

        <p class="mb-4 text-[13px] text-ink-soft">
          Изменения статуса юнита и лидов будут приходить в указанный Telegram-чат. Пока чат не подключён, уведомления не отправляются.
        </p>

        <div v-if="chatId" class="mb-4 flex items-center justify-between rounded-xl bg-status-free-soft px-3.5 py-2.5">
          <span class="text-[13px] font-semibold text-brand-dark">Подключён: {{ chatId }}</span>
          <button
            type="button"
            :disabled="saving"
            class="flex items-center gap-1 text-[12px] font-semibold text-status-deposit hover:underline disabled:opacity-60"
            @click="disconnect"
          >
            <Unlink :size="12" /> Отключить
          </button>
        </div>

        <label class="mb-1 block text-[12px] text-ink-soft">Chat ID</label>
        <div class="flex gap-2">
          <input
            v-model="input"
            type="text"
            placeholder="-100123456789"
            class="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
          <button
            type="button"
            :disabled="saving || input.trim() === ''"
            class="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            @click="save"
          >
            {{ chatId ? 'Изменить' : 'Подключить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
