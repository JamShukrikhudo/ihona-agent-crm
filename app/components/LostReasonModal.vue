<script setup lang="ts">
import { X } from '@lucide/vue'

export type LostReason = 'price_disagreement' | 'financing_fell_through' | 'buyer_withdrew' | 'unit_no_longer_available' | 'unresponsive' | 'other'

const REASON_LABEL: Record<LostReason, string> = {
  price_disagreement: 'Не сошлись в цене',
  financing_fell_through: 'Не одобрили ипотеку/рассрочку',
  buyer_withdrew: 'Покупатель передумал',
  unit_no_longer_available: 'Квартира больше недоступна',
  unresponsive: 'Не выходит на связь',
  other: 'Другое',
}
const REASONS = Object.keys(REASON_LABEL) as LostReason[]

const emit = defineEmits<{ confirm: [reason: LostReason]; cancel: [] }>()

const selected = ref<LostReason>('price_disagreement')
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="emit('cancel')">
    <div class="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-display text-sm font-bold text-ink">Причина отказа</h3>
        <button type="button" class="text-ink-soft hover:text-ink" @click="emit('cancel')">
          <X :size="16" />
        </button>
      </div>

      <div class="space-y-1.5">
        <label
          v-for="reason in REASONS"
          :key="reason"
          class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px]"
          :class="selected === reason ? 'border-brand-600 bg-brand-50 text-ink' : 'border-line text-ink-soft'"
        >
          <input v-model="selected" type="radio" name="lost-reason" :value="reason" class="accent-brand-600" />
          {{ REASON_LABEL[reason] }}
        </label>
      </div>

      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper" @click="emit('cancel')">
          Отмена
        </button>
        <button type="button" class="rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700" @click="emit('confirm', selected)">
          Подтвердить
        </button>
      </div>
    </div>
  </div>
</template>
