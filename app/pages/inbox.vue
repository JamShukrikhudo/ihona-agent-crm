<script setup lang="ts">
import { Camera, MessageCircle, Send } from '@lucide/vue'
import type { InboxChannel } from '~/stores/useInboxStore'

definePageMeta({ middleware: 'agent' })

const CHANNEL_ICON = { telegram: Send, whatsapp: MessageCircle, instagram: Camera } as const
const CHANNEL_LABEL = { telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram' } as const

const store = useInboxStore()
const toast = useToastStore()

const selected = ref<{ clientId: number; channel: InboxChannel } | null>(null)
const message = ref('')
const sending = ref(false)

const sortedConversations = computed(() =>
  [...store.conversations].sort((a, b) => new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime()),
)
const totalUnread = computed(() => store.conversations.reduce((sum, c) => sum + c.unreadCount, 0))

async function openConversation(conversation: { clientId: number; channel: InboxChannel }) {
  selected.value = conversation
  await store.fetchThread(conversation.clientId, conversation.channel)
  if (store.conversations.find((c) => c.clientId === conversation.clientId && c.channel === conversation.channel)?.unreadCount) {
    await store.markRead(conversation.clientId, conversation.channel)
  }
}

async function send() {
  if (!selected.value || message.value.trim() === '') {
    return
  }
  sending.value = true
  try {
    await store.sendMessage(selected.value.clientId, selected.value.channel, message.value.trim())
    message.value = ''
  } catch {
    toast.push('Не удалось отправить сообщение', 'error')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  store.fetchConversations()
})

// Same polling convention as ClientDrawer's chat tabs — a customer's
// reply should show up without a manual refresh.
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollTimer = setInterval(() => {
    store.fetchConversations()
    if (selected.value) {
      store.fetchThread(selected.value.clientId, selected.value.channel)
    }
  }, 5000)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="flex h-screen min-h-0">
    <!-- Conversation list -->
    <div class="flex w-full max-w-sm shrink-0 flex-col border-r border-line bg-card sm:w-80">
      <div class="border-b border-line px-5 py-4">
        <h1 class="font-display text-lg font-bold text-ink">Входящие</h1>
        <p class="text-[12px] text-ink-soft">Telegram, WhatsApp и Instagram — в одном месте{{ totalUnread > 0 ? ` · ${totalUnread} непрочитано` : '' }}</p>
      </div>

      <div v-if="store.loading" class="space-y-2 p-3">
        <div v-for="i in 5" :key="i" class="h-16 animate-pulse rounded-xl bg-paper" />
      </div>

      <div v-else-if="sortedConversations.length === 0" class="p-5 text-[13px] text-ink-soft">
        Пока нет ни одного диалога — они появятся, как только клиент первым напишет в Telegram, WhatsApp или Instagram.
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <UButton
          v-for="c in sortedConversations"
          :key="`${c.clientId}:${c.channel}`"
          color="neutral"
          :variant="selected?.clientId === c.clientId && selected?.channel === c.channel ? 'soft' : 'ghost'"
          block
          :ui="{ base: 'items-start gap-3 rounded-none border-b border-line px-4 py-3 text-left' }"
          @click="openConversation(c)"
        >
          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-brand-600">
            <component :is="CHANNEL_ICON[c.channel]" :size="16" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-[13px] font-semibold text-ink">{{ c.clientName ?? c.displayName ?? c.clientPhone }}</span>
              <span class="shrink-0 text-[10px] text-ink-soft">{{ c.lastAt ? new Date(c.lastAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-[12px] text-ink-soft">
                <span class="font-medium">{{ CHANNEL_LABEL[c.channel] }}:</span> {{ c.lastMessage ?? '—' }}
              </span>
              <UBadge v-if="c.unreadCount > 0" color="primary" size="sm" class="shrink-0 rounded-full">{{ c.unreadCount }}</UBadge>
            </div>
          </div>
        </UButton>
      </div>
    </div>

    <!-- Thread -->
    <div class="flex min-w-0 flex-1 flex-col">
      <template v-if="selected">
        <div class="flex items-center gap-2.5 border-b border-line bg-card px-5 py-3.5">
          <component :is="CHANNEL_ICON[selected.channel]" :size="16" class="text-brand-600" />
          <span class="font-display text-sm font-bold text-ink">
            {{ store.conversations.find((c) => c.clientId === selected?.clientId && c.channel === selected?.channel)?.clientName ?? 'Клиент' }}
          </span>
          <span class="text-[12px] text-ink-soft">· {{ CHANNEL_LABEL[selected.channel] }}</span>
          <UButton :to="`/clients/${selected.clientId}`" variant="link" size="xs" class="ml-auto">
            Карточка клиента
          </UButton>
        </div>

        <div class="flex-1 overflow-y-auto bg-paper/40 p-5">
          <div v-if="store.threadLoading" class="h-full animate-pulse rounded-xl bg-paper" />
          <ClientTimeline v-else :interactions="store.thread" />
        </div>

        <form class="flex items-center gap-2 border-t border-line bg-card p-3" @submit.prevent="send">
          <UInput v-model="message" placeholder="Сообщение…" class="flex-1" />
          <UButton type="submit" :loading="sending" :disabled="message.trim() === ''">
            Отправить
          </UButton>
        </form>
      </template>

      <div v-else class="flex flex-1 items-center justify-center text-[13px] text-ink-soft">
        Выберите диалог слева
      </div>
    </div>
  </div>
</template>
