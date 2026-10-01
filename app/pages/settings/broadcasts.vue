<script setup lang="ts">
import { Cake, Camera, Mail, MessageCircle, MessageSquareText, Send, Settings2 } from '@lucide/vue'

// Telegram, WhatsApp, Instagram and Email are real. The three chat
// channels each reuse the team's own bot/number/account
// (settings/telegram.vue, settings/meta.vue) and only reach clients who
// already messaged first — see BroadcastController::sendTelegram/
// sendMeta. Email uses the platform's single SMTP account
// (config/mail.php) and reaches every client with an email on file — see
// BroadcastController::sendEmail. SMS/templates/birthday-trigger stay
// "not connected" placeholders — no SMS gateway exists anywhere in this
// codebase — rather than a fake compose box, until a real one is chosen.
definePageMeta({ middleware: 'sales-manager' })

const CHANNELS = [
  { value: 'sms', label: 'SMS', icon: MessageSquareText },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'templates', label: 'Шаблоны', icon: Settings2 },
  { value: 'birthday', label: 'День рождения', icon: Cake },
] as const

type ChannelValue = (typeof CHANNELS)[number]['value']
type LiveChannel = 'telegram' | 'whatsapp' | 'instagram' | 'email'
const LIVE_CHANNELS: LiveChannel[] = ['telegram', 'whatsapp', 'instagram', 'email']
function isLive(v: ChannelValue): v is LiveChannel {
  return (LIVE_CHANNELS as string[]).includes(v)
}

const active = ref<ChannelValue>('telegram')

const CHANNEL_COPY: Partial<Record<ChannelValue, { title: string; body: string }>> = {
  sms: {
    title: 'SMS-провайдер не подключён',
    body: 'Для рассылок по SMS нужен шлюз (например, местный SMS-агрегатор). Как только появятся реквизиты провайдера — эта вкладка станет формой отправки с выбором сегмента клиентов.',
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

interface ChannelState {
  loading: boolean
  connected: boolean
  recipients: number
  subject: string
  message: string
  region: string
  sending: boolean
}

const state = reactive<Record<LiveChannel, ChannelState>>({
  telegram: { loading: true, connected: false, recipients: 0, subject: '', message: '', region: '', sending: false },
  whatsapp: { loading: true, connected: false, recipients: 0, subject: '', message: '', region: '', sending: false },
  instagram: { loading: true, connected: false, recipients: 0, subject: '', message: '', region: '', sending: false },
  email: { loading: true, connected: false, recipients: 0, subject: '', message: '', region: '', sending: false },
})

// No link for email: unlike the three chat channels, it's not a
// per-team setting a manager can configure — it's the platform's one
// SMTP account in config/mail.php, set by whoever administers the
// server (same reasoning as BroadcastController::smtpConfigured).
const CHANNEL_SETTINGS_LINK: Partial<Record<LiveChannel, { to: string; label: string }>> = {
  telegram: { to: '/settings/telegram', label: 'Настройки → Telegram' },
  whatsapp: { to: '/settings/meta', label: 'Настройки → WhatsApp / Instagram' },
  instagram: { to: '/settings/meta', label: 'Настройки → WhatsApp / Instagram' },
}

const RECIPIENTS_COPY: Record<LiveChannel, string> = {
  telegram: 'клиенты, уже писавшие первыми',
  whatsapp: 'клиенты, уже писавшие первыми',
  instagram: 'клиенты, уже писавшие первыми',
  email: 'клиенты с указанным email',
}

function canSend(channel: LiveChannel): boolean {
  const s = state[channel]
  if (s.message.trim() === '') {
    return false
  }
  return channel !== 'email' || s.subject.trim() !== ''
}

async function loadStatus(channel: LiveChannel) {
  state[channel].loading = true
  try {
    const res = await apiFetch<{ data: { connected: boolean; recipients: number } }>(`/broadcasts/${channel}/status`)
    state[channel].connected = res.data.connected
    state[channel].recipients = res.data.recipients
  } finally {
    state[channel].loading = false
  }
}
onMounted(() => {
  for (const channel of LIVE_CHANNELS) {
    loadStatus(channel)
  }
})

async function sendBroadcast(channel: LiveChannel) {
  const s = state[channel]
  if (!canSend(channel)) {
    return
  }
  s.sending = true
  try {
    const res = await apiFetch<{ data: { queued: boolean; recipients: number } }>(`/broadcasts/${channel}`, {
      method: 'POST',
      body: {
        ...(channel === 'email' ? { subject: s.subject.trim() } : {}),
        message: s.message.trim(),
        region: s.region.trim() || undefined,
      },
    })
    toast.push(`Рассылка запущена — получателей: ${res.data.recipients}`, 'success')
    s.subject = ''
    s.message = ''
  } catch (e) {
    const message = (e as { data?: { message?: string } })?.data?.message ?? 'Не удалось запустить рассылку'
    toast.push(message, 'error')
  } finally {
    s.sending = false
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

      <template v-if="isLive(active)">
        <div v-if="state[active].loading" class="h-40 animate-pulse rounded-2xl border border-line bg-card" />

        <div v-else-if="!state[active].connected" class="rounded-2xl border border-dashed border-line bg-card p-6">
          <div class="mb-1 font-display text-sm font-bold text-ink">Не подключено</div>
          <p v-if="CHANNEL_SETTINGS_LINK[active]" class="text-[13px] leading-relaxed text-ink-soft">
            Массовая рассылка использует канал из
            <NuxtLink :to="CHANNEL_SETTINGS_LINK[active]!.to" class="font-semibold text-brand-600 hover:underline">{{ CHANNEL_SETTINGS_LINK[active]!.label }}</NuxtLink>
            — сначала подключите его там.
          </p>
          <p v-else class="text-[13px] leading-relaxed text-ink-soft">
            SMTP-аккаунт для рассылок ещё не настроен на сервере — обратитесь к администратору платформы.
          </p>
        </div>

        <form v-else class="space-y-3 rounded-2xl border border-line bg-card p-5" @submit.prevent="sendBroadcast(active)">
          <div class="rounded-xl bg-status-free-soft px-3.5 py-2.5 text-[13px] font-semibold text-brand-dark">
            Получателей: {{ state[active].recipients }} — {{ RECIPIENTS_COPY[active] }}.
          </div>

          <label class="block text-[12px] text-ink-soft">
            Регион (необязательно)
            <input
              v-model="state[active].region"
              type="text"
              placeholder="Например, Душанбе — оставьте пустым для всех"
              class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>

          <label v-if="active === 'email'" class="block text-[12px] text-ink-soft">
            Тема письма
            <input
              v-model="state[active].subject"
              type="text"
              placeholder="Например, Новая акция от ihona.tj"
              class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>

          <label class="block text-[12px] text-ink-soft">
            Сообщение
            <textarea
              v-model="state[active].message"
              rows="4"
              placeholder="Текст рассылки…"
              class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
          </label>

          <button
            type="submit"
            :disabled="state[active].sending || !canSend(active)"
            class="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {{ state[active].sending ? 'Запускаю…' : 'Отправить рассылку' }}
          </button>
        </form>
      </template>

      <div v-else-if="CHANNEL_COPY[active]" class="rounded-2xl border border-dashed border-line bg-card p-6">
        <div class="mb-1 font-display text-sm font-bold text-ink">{{ CHANNEL_COPY[active]!.title }}</div>
        <p class="text-[13px] leading-relaxed text-ink-soft">{{ CHANNEL_COPY[active]!.body }}</p>
      </div>
    </div>
  </div>
</template>
