<script setup lang="ts">
import { Bot, MessageCircle, Unlink } from '@lucide/vue'

// Replaces the Filament-only TelegramSettings page (see docs/CRM spec) —
// now two separate things: chat_id (which chat gets ops alerts) and
// bot_token (the team's own bot, for real inbound/outbound customer
// chat — see ClientTimeline/clients/[id].vue). Each team needs its own
// bot: Telegram delivers a DM to whichever bot username the customer
// opened, with no team concept attached, so a shared bot can't tell two
// companies' customers apart.
definePageMeta({ middleware: 'sales-manager' })

const chatId = ref<string | null>(null)
const chatInput = ref('')
const botConnected = ref(false)
const botTokenInput = ref('')
const loading = ref(true)
const saving = ref(false)
const savingBot = ref(false)

onMounted(async () => {
  try {
    const res = await apiFetch<{ data: { chat_id: string | null; bot_connected: boolean } }>('/telegram-setting')
    chatId.value = res.data.chat_id
    chatInput.value = res.data.chat_id ?? ''
    botConnected.value = res.data.bot_connected
  } finally {
    loading.value = false
  }
})

async function save() {
  if (chatInput.value.trim() === '') {
    return
  }
  saving.value = true
  try {
    const res = await apiFetch<{ data: { chat_id: string | null } }>('/telegram-setting', {
      method: 'POST',
      body: { chat_id: chatInput.value.trim() },
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
    chatInput.value = ''
    useToastStore().push('Чат отключён', 'success')
  } catch {
    useToastStore().push('Не удалось отключить чат', 'error')
  } finally {
    saving.value = false
  }
}

async function connectBot() {
  if (botTokenInput.value.trim() === '') {
    return
  }
  savingBot.value = true
  try {
    await apiFetch('/telegram-setting/bot', { method: 'POST', body: { bot_token: botTokenInput.value.trim() } })
    botConnected.value = true
    botTokenInput.value = ''
    useToastStore().push('Бот подключён — вебхук зарегистрирован автоматически', 'success')
  } catch {
    useToastStore().push('Не удалось подключить бота — проверьте токен', 'error')
  } finally {
    savingBot.value = false
  }
}

async function disconnectBot() {
  savingBot.value = true
  try {
    await apiFetch('/telegram-setting/bot', { method: 'DELETE' })
    botConnected.value = false
    useToastStore().push('Бот отключён', 'success')
  } finally {
    savingBot.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Настройки</div>
      <h1 class="font-display text-xl font-bold text-ink">Telegram</h1>
    </div>

    <div class="mx-auto max-w-lg space-y-4 px-6 py-8">
      <div v-if="loading" class="h-32 animate-pulse rounded-2xl border border-line bg-card" />

      <template v-else>
        <div class="rounded-2xl border border-line bg-card p-5">
          <div class="mb-2 flex items-center gap-2">
            <Bot :size="16" class="text-brand-600" />
            <span class="font-display text-sm font-bold text-ink">Бот для чата с клиентами</span>
          </div>
          <p class="mb-4 text-[13px] text-ink-soft">
            Ваш собственный бот (создаётся бесплатно через
            <span class="font-medium text-ink">@BotFather</span> в Telegram). Сообщения клиентов будут появляться в карточке клиента, ответы отправляются
            прямо оттуда.
          </p>

          <div v-if="botConnected" class="mb-4 flex items-center justify-between rounded-xl bg-status-free-soft px-3.5 py-2.5">
            <span class="text-[13px] font-semibold text-brand-dark">Бот подключён и принимает сообщения</span>
            <button
              type="button"
              :disabled="savingBot"
              class="flex items-center gap-1 text-[12px] font-semibold text-status-deposit hover:underline disabled:opacity-60"
              @click="disconnectBot"
            >
              <Unlink :size="12" /> Отключить
            </button>
          </div>
          <template v-else>
            <label class="mb-1 block text-[12px] text-ink-soft">Токен бота (от @BotFather)</label>
            <div class="flex gap-2">
              <input
                v-model="botTokenInput"
                type="text"
                placeholder="123456789:AA..."
                class="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
              />
              <button
                type="button"
                :disabled="savingBot || botTokenInput.trim() === ''"
                class="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                @click="connectBot"
              >
                Подключить
              </button>
            </div>
          </template>
        </div>

        <div class="rounded-2xl border border-line bg-card p-5">
          <div class="mb-2 flex items-center gap-2">
            <MessageCircle :size="16" class="text-brand-600" />
            <span class="font-display text-sm font-bold text-ink">Чат для оповещений</span>
          </div>

          <p class="mb-4 text-[13px] text-ink-soft">Изменения статуса юнита и лидов будут приходить в указанный чат. Отдельно от бота выше.</p>

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
              v-model="chatInput"
              type="text"
              placeholder="-100123456789"
              class="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              :disabled="saving || chatInput.trim() === ''"
              class="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              @click="save"
            >
              {{ chatId ? 'Изменить' : 'Подключить' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
