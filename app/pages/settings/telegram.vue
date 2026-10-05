<script setup lang="ts">
import { Bot, MessageCircle } from '@lucide/vue'

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
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Настройки</div>
      <h1 class="font-display text-xl font-bold">Telegram</h1>
    </div>

    <div class="mx-auto max-w-lg space-y-4 px-6 py-8">
      <VSkeleton v-if="loading" type="card" height="128" />

      <template v-else>
        <VCard>
          <VCardText>
            <div class="mb-2 flex items-center gap-2">
              <Bot :size="16" class="text-primary" />
              <span class="font-display text-sm font-bold">Бот для чата с клиентами</span>
            </div>
            <p class="mb-4 text-[13px] text-medium-emphasis">
              Ваш собственный бот (создаётся бесплатно через
              <span class="font-medium">@BotFather</span> в Telegram). Сообщения клиентов будут появляться в карточке клиента, ответы отправляются
              прямо оттуда.
            </p>

            <VAlert v-if="botConnected" type="success" variant="tonal" class="mb-4">
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-semibold">Бот подключён и принимает сообщения</span>
                <VBtn icon="mdi-link-off" color="error" variant="text" size="small" :loading="savingBot" @click="disconnectBot" />
              </div>
            </VAlert>
            <div v-else class="flex gap-2">
              <VTextField v-model="botTokenInput" label="Токен бота (от @BotFather)" placeholder="123456789:AA..." hide-details class="flex-1" />
              <VBtn color="primary" :loading="savingBot" :disabled="botTokenInput.trim() === ''" @click="connectBot">Подключить</VBtn>
            </div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardText>
            <div class="mb-2 flex items-center gap-2">
              <MessageCircle :size="16" class="text-primary" />
              <span class="font-display text-sm font-bold">Чат для оповещений</span>
            </div>

            <p class="mb-4 text-[13px] text-medium-emphasis">Изменения статуса юнита и лидов будут приходить в указанный чат. Отдельно от бота выше.</p>

            <VAlert v-if="chatId" type="success" variant="tonal" class="mb-4">
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-semibold">Подключён: {{ chatId }}</span>
                <VBtn icon="mdi-link-off" color="error" variant="text" size="small" :loading="saving" @click="disconnect" />
              </div>
            </VAlert>

            <div class="flex gap-2">
              <VTextField v-model="chatInput" label="Chat ID" placeholder="-100123456789" hide-details class="flex-1" />
              <VBtn color="primary" :loading="saving" :disabled="chatInput.trim() === ''" @click="save">
                {{ chatId ? 'Изменить' : 'Подключить' }}
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </template>
    </div>
  </div>
</template>
