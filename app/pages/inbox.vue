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
    <div class="flex w-full max-w-sm shrink-0 flex-col border-r border-surface-light bg-surface sm:w-80">
      <div class="border-b border-surface-light px-5 py-4">
        <h1 class="font-display text-lg font-bold">Входящие</h1>
        <p class="text-[12px] text-medium-emphasis">Telegram, WhatsApp и Instagram — в одном месте{{ totalUnread > 0 ? ` · ${totalUnread} непрочитано` : '' }}</p>
      </div>

      <div v-if="store.loading" class="space-y-2 p-3">
        <VSkeleton v-for="i in 5" :key="i" type="list-item-avatar-two-line" />
      </div>

      <div v-else-if="sortedConversations.length === 0" class="p-5 text-[13px] text-medium-emphasis">
        Пока нет ни одного диалога — они появятся, как только клиент первым напишет в Telegram, WhatsApp или Instagram.
      </div>

      <VList v-else class="flex-1 overflow-y-auto py-0">
        <VListItem
          v-for="c in sortedConversations"
          :key="`${c.clientId}:${c.channel}`"
          :active="selected?.clientId === c.clientId && selected?.channel === c.channel"
          lines="two"
          @click="openConversation(c)"
        >
          <template #prepend>
            <VAvatar color="primary" variant="tonal" size="36">
              <component :is="CHANNEL_ICON[c.channel]" :size="16" />
            </VAvatar>
          </template>
          <VListItemTitle class="flex items-center justify-between gap-2 text-[13px] font-semibold">
            <span class="truncate">{{ c.clientName ?? c.displayName ?? c.clientPhone }}</span>
            <span class="shrink-0 text-[10px] font-normal text-medium-emphasis">{{ c.lastAt ? new Date(c.lastAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }}</span>
          </VListItemTitle>
          <VListItemSubtitle class="flex items-center justify-between gap-2 text-[12px]">
            <span class="truncate"><span class="font-medium">{{ CHANNEL_LABEL[c.channel] }}:</span> {{ c.lastMessage ?? '—' }}</span>
            <VChip v-if="c.unreadCount > 0" color="primary" size="x-small" class="shrink-0">{{ c.unreadCount }}</VChip>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </div>

    <!-- Thread -->
    <div class="flex min-w-0 flex-1 flex-col">
      <template v-if="selected">
        <div class="flex items-center gap-2.5 border-b border-surface-light bg-surface px-5 py-3.5">
          <component :is="CHANNEL_ICON[selected.channel]" :size="16" class="text-primary" />
          <span class="font-display text-sm font-bold">
            {{ store.conversations.find((c) => c.clientId === selected?.clientId && c.channel === selected?.channel)?.clientName ?? 'Клиент' }}
          </span>
          <span class="text-[12px] text-medium-emphasis">· {{ CHANNEL_LABEL[selected.channel] }}</span>
          <VBtn :to="`/clients/${selected.clientId}`" variant="text" color="primary" size="x-small" class="ml-auto">
            Карточка клиента
          </VBtn>
        </div>

        <div class="flex-1 overflow-y-auto bg-surface-light/40 p-5">
          <VSkeleton v-if="store.threadLoading" type="article" />
          <ClientTimeline v-else :interactions="store.thread" />
        </div>

        <form class="flex items-center gap-2 border-t border-surface-light bg-surface p-3" @submit.prevent="send">
          <VTextField v-model="message" placeholder="Сообщение…" hide-details density="compact" class="flex-1" />
          <VBtn type="submit" color="primary" :loading="sending" :disabled="message.trim() === ''">
            Отправить
          </VBtn>
        </form>
      </template>

      <div v-else class="flex flex-1 items-center justify-center text-[13px] text-medium-emphasis">
        Выберите диалог слева
      </div>
    </div>
  </div>
</template>
