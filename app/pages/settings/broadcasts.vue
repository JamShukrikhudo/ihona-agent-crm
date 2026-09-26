<script setup lang="ts">
import { Cake, Mail, MessageCircle, MessageSquareText, Phone, Send, Settings2 } from '@lucide/vue'

// UI-only shell — no provider is wired up yet (no SMS/Email gateway
// credentials exist anywhere in this codebase, and the Telegram bot
// configured in settings/telegram.vue is scoped to 1:1 client replies,
// not mass sends). Every tab below is deliberately a "not connected"
// state rather than a fake compose box, until a real provider is chosen.
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

const active = ref<(typeof CHANNELS)[number]['value']>('sms')

const CHANNEL_COPY: Record<(typeof CHANNELS)[number]['value'], { title: string; body: string }> = {
  sms: {
    title: 'SMS-провайдер не подключён',
    body: 'Для рассылок по SMS нужен шлюз (например, местный SMS-агрегатор). Как только появятся реквизиты провайдера — эта вкладка станет формой отправки с выбором сегмента клиентов.',
  },
  telegram: {
    title: 'Массовая рассылка в Telegram не настроена',
    body: 'Бот в «Настройки → Telegram» отвечает только конкретному клиенту в его карточке. Для массовой рассылки всем подписчикам нужен отдельный сценарий подтверждения (клиент должен сам написать боту первым) — это ещё не реализовано.',
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

      <div class="rounded-2xl border border-dashed border-line bg-card p-6">
        <div class="mb-1 font-display text-sm font-bold text-ink">{{ CHANNEL_COPY[active].title }}</div>
        <p class="text-[13px] leading-relaxed text-ink-soft">{{ CHANNEL_COPY[active].body }}</p>
      </div>
    </div>
  </div>
</template>
