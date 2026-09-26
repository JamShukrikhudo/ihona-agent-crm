<script setup lang="ts">
import { Cake, Mail, MessageCircle, MessageSquareText, Phone, Send, Settings2 } from '@lucide/vue'

// Telegram is real: it reuses the team's own bot (settings/telegram.vue)
// and only reaches clients who already messaged that bot first — see
// BroadcastController::sendTelegram. Every other tab stays a "not
// connected" placeholder — no SMS/Email/WhatsApp Business API
// credentials exist anywhere in this codebase — rather than a fake
// compose box, until a real provider is chosen.
definePageMeta({ middleware: 'sales-manager' })

const CHANNELS = [
  { value: 'sms', label: 'SMS', icon: MessageSquareText },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telegram-bot', label: 'Telegram-бот', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'templates', label: 'Шаблоны', icon: Settings2 },
  { value: 'birthday', label: 'День рождения', icon: Cake },
] as const

const active = ref<(typeof CHANNELS)[number]['value']>('telegram')

// 'telegram' has its own real form below and never reads this map, but
// keeping it out of the Record type just to satisfy the template's
// v-else branch isn't worth the narrowing complexity for a static lookup.
const CHANNEL_COPY: Record<(typeof CHANNELS)[number]['value'], { title: string; body: string }> = {
  telegram: { title: '', body: '' },
  sms: {
    title: 'SMS-провайдер не подключён',
    body: 'Для рассылок по SMS нужен шлюз (например, местный SMS-агрегатор). Как только появятся реквизиты провайдера — эта вкладка станет формой отправки с выбором сегмента клиентов.',
  },
  whatsapp: {
    title: 'WhatsApp-провайдер не подключён',
    body: 'Нужен доступ к WhatsApp Business API (например, через Meta или стороннего агрегатора). Сейчас WhatsApp-сообщения в карточке клиента можно только вручную логировать, отправка недоступна.',
  },
  'telegram-bot': {
    title: 'Бот для рассылок не подключён',
    body: 'Отдельно от бота 1:1-переписки: для рассылок по базе подписчиков понадобится бот с собственным списком чатов и явным согласием клиентов. Не настроено.',
  },
  email: {
    title: 'Email-провайдер не подключён',
    body: 'Нужен SMTP или транзакционный сервис (например, свой домен + провайдер рассылок). У клиентов пока даже не у всех указан email — сначала имеет смысл собрать эти данные.',
  },
  templates: {
    title: 'Шаблонов пока нет',
    body: 'Шаблоны сообщений появятся здесь, как только будет подключён хотя бы один канал отправки — создавать шаблон для несуществующей рассылки нет смысла.',
  },
  birthday: {
    title: 'Автопоздравления не настроены',
    body: 'Идея — авто-отправка поздравления в день рождения клиента. Требует и даты рождения в карточке клиента (сейчас такого поля нет), и хотя бы одного подключённого канала отправки.',
  },
}

const toast = useToastStore()

const tgLoading = ref(true)
const tgConnected = ref(false)
const tgRecipients = ref(0)
const tgMessage = ref('')
const tgRegion = ref('')
const tgSending = ref(false)

async function loadTelegramStatus() {
  tgLoading.value = true
  try {
    const res = await apiFetch<{ data: { connected: boolean; recipients: number } }>('/broadcasts/telegram/status')
    tgConnected.value = res.data.connected
    tgRecipients.value = res.data.recipients
  } finally {
    tgLoading.value = false
  }
}
onMounted(loadTelegramStatus)

async function sendTelegramBroadcast() {
  if (tgMessage.value.trim() === '') {
    return
  }
  tgSending.value = true
  try {
    const res = await apiFetch<{ data: { queued: boolean; recipients: number } }>('/broadcasts/telegram', {
      method: 'POST',
      body: { message: tgMessage.value.trim(), region: tgRegion.value.trim() || undefined },
    })
    toast.push(`Рассылка запущена — получателей: ${res.data.recipients}`, 'success')
    tgMessage.value = ''
  } catch (e) {
    const message = (e as { data?: { message?: string } })?.data?.message ?? 'Не удалось запустить рассылку'
    toast.push(message, 'error')
  } finally {
    tgSending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Настройки</div>
      <h1 class="font-display text-xl font-bold text-ink">Рассылки</h1>
    </div>

    <div class="mx-auto max-w-2xl px-6 py-8">
      <div class="mb-4 flex flex-wrap gap-1.5">
        <button
          v-for="ch in CHANNELS"
          :key="ch.value"
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
          :class="active === ch.value ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft hover:bg-card'"
          @click="active = ch.value"
        >
          <component :is="ch.icon" :size="13" /> {{ ch.label }}
        </button>
      </div>

      <div v-if="active === 'telegram'">
        <div v-if="tgLoading" class="h-40 animate-pulse rounded-2xl border border-line bg-card" />

        <div v-else-if="!tgConnected" class="rounded-2xl border border-dashed border-line bg-card p-6">
          <div class="mb-1 font-display text-sm font-bold text-ink">Бот не подключён</div>
          <p class="text-[13px] leading-relaxed text-ink-soft">
            Массовая рассылка использует бота из
            <NuxtLink to="/settings/telegram" class="font-semibold text-brand-600 hover:underline">Настройки → Telegram</NuxtLink>
            — сначала подключите его там.
          </p>
        </div>

        <form v-else class="space-y-3 rounded-2xl border border-line bg-card p-5" @submit.prevent="sendTelegramBroadcast">
          <div class="rounded-xl bg-status-free-soft px-3.5 py-2.5 text-[13px] font-semibold text-brand-dark">
            Получателей: {{ tgRecipients }} — клиенты, уже писавшие боту.
          </div>

          <label class="block text-[12px] text-ink-soft">
            Регион (необязательно)
            <input
              v-model="tgRegion"
              type="text"
              placeholder="Например, Душанбе — оставьте пустым для всех"
              class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>

          <label class="block text-[12px] text-ink-soft">
            Сообщение
            <textarea
              v-model="tgMessage"
              rows="4"
              placeholder="Текст рассылки…"
              class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>

          <button
            type="submit"
            :disabled="tgSending || tgMessage.trim() === ''"
            class="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {{ tgSending ? 'Запускаю…' : 'Отправить рассылку' }}
          </button>
        </form>
      </div>

      <div v-else class="rounded-2xl border border-dashed border-line bg-card p-6">
        <div class="mb-1 font-display text-sm font-bold text-ink">{{ CHANNEL_COPY[active].title }}</div>
        <p class="text-[13px] leading-relaxed text-ink-soft">{{ CHANNEL_COPY[active].body }}</p>
      </div>
    </div>
  </div>
</template>
