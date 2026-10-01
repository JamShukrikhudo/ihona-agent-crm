<script setup lang="ts">
import { Cake, Camera, Mail, MessageCircle, MessageSquareText, Send, Settings2 } from '@lucide/vue'

// Telegram, WhatsApp, Instagram and Email are real: one compose box,
// checkboxes to pick which of the four to fire at once (not a tab per
// channel — a manager announcing a promotion shouldn't have to retype
// the same message four times). Each chat channel reuses the team's own
// bot/number/account and only reaches clients who already messaged
// first — see BroadcastController::sendTelegram/sendMeta. Email uses the
// platform's single SMTP account and reaches every client with an email
// on file — see BroadcastController::sendEmail. SMS/templates/
// birthday-trigger stay separate "not connected" placeholders below — no
// SMS gateway exists anywhere in this codebase — rather than a fake
// compose box, until a real one is chosen.
definePageMeta({ middleware: 'sales-manager' })

type LiveChannel = 'telegram' | 'whatsapp' | 'instagram' | 'email'
const LIVE_CHANNELS: { value: LiveChannel; label: string; icon: typeof Send }[] = [
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'email', label: 'Email', icon: Mail },
]

const PLACEHOLDER_CHANNELS = [
  { value: 'sms', label: 'SMS', icon: MessageSquareText, title: 'SMS-провайдер не подключён', body: 'Для рассылок по SMS нужен шлюз (например, местный SMS-агрегатор). Как только появятся реквизиты провайдера — здесь появится ещё один канал в списке выше.' },
  { value: 'templates', label: 'Шаблоны', icon: Settings2, title: 'Шаблонов пока нет', body: 'Шаблоны сообщений появятся здесь, как только будет подключён хотя бы один канал отправки — создавать шаблон для несуществующей рассылки нет смысла.' },
  { value: 'birthday', label: 'День рождения', icon: Cake, title: 'Автопоздравления не настроены', body: 'Идея — авто-отправка поздравления в день рождения клиента. Требует и даты рождения в карточке клиента (сейчас такого поля нет), и хотя бы одного подключённого канала отправки.' },
] as const
const activePlaceholder = ref<(typeof PLACEHOLDER_CHANNELS)[number]['value'] | null>(null)

const CHANNEL_SETTINGS_LINK: Partial<Record<LiveChannel, { to: string; label: string }>> = {
  telegram: { to: '/settings/telegram', label: 'Настройки → Telegram' },
  whatsapp: { to: '/settings/meta', label: 'Настройки → WhatsApp / Instagram' },
  instagram: { to: '/settings/meta', label: 'Настройки → WhatsApp / Instagram' },
}

const RECIPIENTS_COPY: Record<LiveChannel, string> = {
  telegram: 'писавших первыми',
  whatsapp: 'писавших первыми',
  instagram: 'писавших первыми',
  email: 'с указанным email',
}

interface ChannelStatus {
  loading: boolean
  connected: boolean
  recipients: number
}

const status = reactive<Record<LiveChannel, ChannelStatus>>({
  telegram: { loading: true, connected: false, recipients: 0 },
  whatsapp: { loading: true, connected: false, recipients: 0 },
  instagram: { loading: true, connected: false, recipients: 0 },
  email: { loading: true, connected: false, recipients: 0 },
})

async function loadStatus(channel: LiveChannel) {
  status[channel].loading = true
  try {
    const res = await apiFetch<{ data: { connected: boolean; recipients: number } }>(`/broadcasts/${channel}/status`)
    status[channel].connected = res.data.connected
    status[channel].recipients = res.data.recipients
  } finally {
    status[channel].loading = false
  }
}
onMounted(() => {
  for (const { value } of LIVE_CHANNELS) {
    loadStatus(value)
  }
})

const selected = reactive<Record<LiveChannel, boolean>>({ telegram: false, whatsapp: false, instagram: false, email: false })
const selectedChannels = computed(() => LIVE_CHANNELS.map((c) => c.value).filter((v) => selected[v]))

const subject = ref('')
const message = ref('')
const region = ref('')
const sending = ref(false)
const toast = useToastStore()

const canSend = computed(() => {
  if (selectedChannels.value.length === 0 || message.value.trim() === '') {
    return false
  }
  return !selected.email || subject.value.trim() !== ''
})

async function send() {
  if (!canSend.value) {
    return
  }
  sending.value = true
  try {
    const results = await Promise.allSettled(
      selectedChannels.value.map((channel) =>
        apiFetch<{ data: { queued: boolean; recipients: number } }>(`/broadcasts/${channel}`, {
          method: 'POST',
          body: {
            ...(channel === 'email' ? { subject: subject.value.trim() } : {}),
            message: message.value.trim(),
            region: region.value.trim() || undefined,
          },
        }).then((res) => ({ channel, recipients: res.data.recipients })),
      ),
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ channel: LiveChannel; recipients: number }>[]
    const failed = results
      .map((r, i) => ({ r, channel: selectedChannels.value[i]! }))
      .filter(({ r }) => r.status === 'rejected') as { r: PromiseRejectedResult; channel: LiveChannel }[]

    if (succeeded.length > 0) {
      const summary = succeeded.map((s) => `${s.value.channel}: ${s.value.recipients}`).join(', ')
      toast.push(`Рассылка запущена — ${summary}`, 'success')
    }
    for (const { r, channel } of failed) {
      const msg = (r.reason as { data?: { message?: string } })?.data?.message ?? 'не удалось запустить'
      toast.push(`${channel}: ${msg}`, 'error')
    }

    if (failed.length === 0) {
      subject.value = ''
      message.value = ''
    }
  } finally {
    sending.value = false
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
      <form class="space-y-4 rounded-2xl border border-line bg-card p-5" @submit.prevent="send">
        <div>
          <div class="mb-2 text-[12px] font-semibold text-ink-soft">Каналы</div>
          <div class="space-y-1.5">
            <label
              v-for="ch in LIVE_CHANNELS"
              :key="ch.value"
              class="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5"
              :class="status[ch.value].connected ? 'cursor-pointer hover:bg-paper' : 'opacity-60'"
            >
              <input
                type="checkbox"
                :checked="selected[ch.value]"
                :disabled="!status[ch.value].connected"
                class="h-4 w-4 rounded border-line text-brand-600"
                @change="selected[ch.value] = ($event.target as HTMLInputElement).checked"
              />
              <component :is="ch.icon" :size="15" class="text-ink-soft" />
              <span class="text-[13px] font-semibold text-ink">{{ ch.label }}</span>
              <span class="ml-auto text-[12px] text-ink-soft">
                <template v-if="status[ch.value].loading">…</template>
                <template v-else-if="!status[ch.value].connected">
                  не подключено<template v-if="CHANNEL_SETTINGS_LINK[ch.value]"> —
                    <NuxtLink :to="CHANNEL_SETTINGS_LINK[ch.value]!.to" class="font-semibold text-brand-600 hover:underline" @click.stop>настроить</NuxtLink>
                  </template>
                </template>
                <template v-else>{{ status[ch.value].recipients }} {{ RECIPIENTS_COPY[ch.value] }}</template>
              </span>
            </label>
          </div>
        </div>

        <label class="block text-[12px] text-ink-soft">
          Регион (необязательно)
          <input
            v-model="region"
            type="text"
            placeholder="Например, Душанбе — оставьте пустым для всех"
            class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <label v-if="selected.email" class="block text-[12px] text-ink-soft">
          Тема письма
          <input
            v-model="subject"
            type="text"
            placeholder="Например, Новая акция от ihona.tj"
            class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <label class="block text-[12px] text-ink-soft">
          Сообщение
          <textarea
            v-model="message"
            rows="4"
            placeholder="Текст рассылки…"
            class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        <button
          type="submit"
          :disabled="sending || !canSend"
          class="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {{ sending ? 'Запускаю…' : `Отправить${selectedChannels.length > 1 ? ` (${selectedChannels.length} канала)` : ''}` }}
        </button>
      </form>

      <div class="mt-6">
        <div class="mb-3 text-[12px] font-semibold text-ink-soft">Другие каналы</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="ch in PLACEHOLDER_CHANNELS"
            :key="ch.value"
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
            :class="activePlaceholder === ch.value ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft hover:bg-card'"
            @click="activePlaceholder = activePlaceholder === ch.value ? null : ch.value"
          >
            <component :is="ch.icon" :size="13" /> {{ ch.label }}
          </button>
        </div>

        <div v-if="activePlaceholder" class="mt-3 rounded-2xl border border-dashed border-line bg-card p-6">
          <template v-for="ch in PLACEHOLDER_CHANNELS" :key="ch.value">
            <template v-if="ch.value === activePlaceholder">
              <div class="mb-1 font-display text-sm font-bold text-ink">{{ ch.title }}</div>
              <p class="text-[13px] leading-relaxed text-ink-soft">{{ ch.body }}</p>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
