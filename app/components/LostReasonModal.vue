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
  <div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4" @click.self="emit('cancel')">
    <VCard class="w-full max-w-sm" title="Причина отказа">
      <template #append>
        <VBtn icon="mdi-close" color="default" variant="text" size="small" @click="emit('cancel')" />
      </template>
      <VCardText>
        <VRadioGroup v-model="selected" :items="REASON_ITEMS" hide-details>
          <VRadio v-for="item in REASON_ITEMS" :key="item.value" :label="item.label" :value="item.value" />
        </VRadioGroup>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" @click="emit('cancel')">Отмена</VBtn>
        <VBtn color="primary" @click="emit('confirm', selected)">Подтвердить</VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>
