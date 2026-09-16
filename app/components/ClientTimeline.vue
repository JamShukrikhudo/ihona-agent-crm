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

    <div v-for="item in interactions" :key="item.id" class="flex gap-3">
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
  </div>
</template>
