<script setup lang="ts">
export type LostReason = 'price_disagreement' | 'financing_fell_through' | 'buyer_withdrew' | 'unit_no_longer_available' | 'unresponsive' | 'other'

const REASON_LABEL: Record<LostReason, string> = {
  price_disagreement: 'Не сошлись в цене',
  financing_fell_through: 'Не одобрили ипотеку/рассрочку',
  buyer_withdrew: 'Покупатель передумал',
  unit_no_longer_available: 'Квартира больше недоступна',
  unresponsive: 'Не выходит на связь',
  other: 'Другое',
}
const REASON_ITEMS = (Object.keys(REASON_LABEL) as LostReason[]).map((value) => ({ label: REASON_LABEL[value], value }))

const emit = defineEmits<{ confirm: [reason: LostReason]; cancel: [] }>()

const selected = ref<LostReason>('price_disagreement')
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="emit('cancel')">
    <div class="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-display text-sm font-bold text-ink">Причина отказа</h3>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="emit('cancel')" />
      </div>

      <URadioGroup v-model="selected" :items="REASON_ITEMS" />

      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="emit('cancel')">Отмена</UButton>
        <UButton @click="emit('confirm', selected)">Подтвердить</UButton>
      </div>
    </div>
  </div>
</template>
