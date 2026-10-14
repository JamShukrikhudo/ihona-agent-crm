import { defineStore } from 'pinia'
import type { ClientInteraction } from './useClientsStore'

export type InboxChannel = 'telegram' | 'whatsapp' | 'instagram' | 'messenger'

export interface Conversation {
  clientId: number
  clientName: string | null
  clientPhone: string | null
  channel: InboxChannel
  displayName: string | null
  lastMessage: string | null
  lastDirection: 'inbound' | 'outbound' | null
  lastAt: string | null
  unreadCount: number
}

interface State {
  conversations: Conversation[]
  loading: boolean
  thread: ClientInteraction[]
  threadLoading: boolean
}

/**
 * Backs the unified "Входящие" — one list across Telegram/WhatsApp/
 * Instagram instead of a tab per channel inside each client's own card
 * (see ClientDrawer, which still has those — this is a separate, new
 * surface, not a replacement for it).
 */
export const useInboxStore = defineStore('inbox', {
  state: (): State => ({
    conversations: [],
    loading: false,
    thread: [],
    threadLoading: false,
  }),
  actions: {
    async fetchConversations() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: Conversation[] }>('/inbox/conversations')
        this.conversations = res.data
      } finally {
        this.loading = false
      }
    },
    async fetchThread(clientId: number, channel: InboxChannel) {
      this.threadLoading = true
      try {
        const res = await apiFetch<{ data: ClientInteraction[] }>(`/inbox/conversations/${clientId}/${channel}`)
        this.thread = res.data
      } finally {
        this.threadLoading = false
      }
    },
    async markRead(clientId: number, channel: InboxChannel) {
      await apiFetch(`/inbox/conversations/${clientId}/${channel}/read`, { method: 'POST' })
      const conversation = this.conversations.find((c) => c.clientId === clientId && c.channel === channel)
      if (conversation) {
        conversation.unreadCount = 0
      }
    },
    async sendMessage(clientId: number, channel: InboxChannel, message: string) {
      const interaction = await apiFetch<{ data: ClientInteraction }>(`/inbox/conversations/${clientId}/${channel}/messages`, {
        method: 'POST',
        body: { message },
      })
      this.thread.push(interaction.data)
      const conversation = this.conversations.find((c) => c.clientId === clientId && c.channel === channel)
      if (conversation) {
        conversation.lastMessage = message
        conversation.lastDirection = 'outbound'
        conversation.lastAt = interaction.data.createdAt
      }
    },
  },
})
