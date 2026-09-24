<script setup lang="ts">
import { CheckCircle2, KeyRound, MessageCircle, Phone, Send, StickyNote, XCircle } from '@lucide/vue'
import type { ClientInteraction } from '~/stores/useClientsStore'

defineProps<{ interactions: ClientInteraction[] }>()

const TYPE_ICON = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageCircle,
  telegram: Send,
  reserved: KeyRound,
  released: XCircle,
  deposit: CheckCircle2,
  sold: CheckCircle2,
} as const

const TYPE_LABEL: Record<ClientInteraction['type'], string> = {
  note: 'Заметка',
  call: 'Звонок',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  reserved: 'Бронирование',
  released: 'Снятие брони',
  deposit: 'Задаток внесён',
  sold: 'Продано',
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="interactions.length === 0" class="text-[13px] text-ink-soft">История пока пуста.</p>

    <template v-for="item in interactions" :key="item.id">
      <!-- A real channel message (has a direction) renders as a chat
           bubble — inbound left/muted like the customer's own side of a
           conversation, outbound right/brand-colored like the agent's.
           Everything else (manual notes, system events) keeps the
           original icon-row activity-log look. -->
      <div v-if="item.direction" class="flex" :class="item.direction === 'outbound' ? 'justify-end' : 'justify-start'">
        <div
          class="max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px]"
          :class="item.direction === 'outbound' ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-paper text-ink'"
        >
          <p class="whitespace-pre-wrap">{{ item.message }}</p>
          <div class="mt-1 text-[10px]" :class="item.direction === 'outbound' ? 'text-white/70' : 'text-ink-soft'">
            {{ new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
            <span v-if="item.createdBy"> · {{ item.createdBy }}</span>
          </div>
        </div>
      </div>

      <div v-else class="flex gap-3">
        <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-brand-600">
          <component :is="TYPE_ICON[item.type]" :size="14" />
        </div>
        <div class="min-w-0 flex-1 border-b border-line pb-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[13px] font-semibold text-ink">{{ TYPE_LABEL[item.type] }}</span>
            <span class="text-[11px] text-ink-soft">{{ new Date(item.createdAt).toLocaleString('ru-RU') }}</span>
          </div>
          <div v-if="item.unitLabel" class="text-[12px] text-ink-soft">Юнит {{ item.unitLabel }}</div>
          <p v-if="item.message" class="mt-1 text-[13px] text-ink">{{ item.message }}</p>
          <div v-if="item.createdBy" class="mt-1 text-[11px] text-ink-soft">{{ item.createdBy }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
