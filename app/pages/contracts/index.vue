<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

definePageMeta({ middleware: 'sales-manager' })

const store = useContractsStore()

onMounted(() => store.fetchAll())
</script>

<template>
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Договоры и рассрочка</div>
      <h1 class="font-display text-xl font-bold">
        {{ store.contracts.length }} договоров
        <span v-if="store.overdueCount > 0" class="ml-2 text-[13px] font-semibold text-error">· {{ store.overdueCount }} с просрочкой</span>
      </h1>
    </div>

    <div class="mx-auto max-w-4xl px-6 py-6">
      <div v-if="store.loading" class="text-sm text-medium-emphasis">Загрузка…</div>
      <div v-else-if="store.contracts.length === 0" class="text-sm text-medium-emphasis">Договоров пока нет.</div>

      <VCard v-else>
        <VList lines="two">
          <VListItem
            v-for="contract in store.contracts"
            :key="contract.id"
            :to="`/contracts/${contract.id}`"
          >
            <VListItemTitle class="flex items-center gap-2 text-[13px] font-semibold">
              {{ contract.unitLabel ?? `Юнит #${contract.unitId}` }}
              <VIcon v-if="contract.installments?.some((i) => i.overdue)" icon="mdi-alert-outline" size="13" color="error" />
            </VListItemTitle>
            <VListItemSubtitle class="text-[11px]">{{ contract.clientName ?? 'Без клиента' }} · подписан {{ new Date(contract.signedAt).toLocaleDateString('ru-RU') }}</VListItemSubtitle>
            <template #append>
              <div class="text-right">
                <div class="text-[13px] font-semibold">{{ contract.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</div>
                <div class="text-[11px] text-medium-emphasis">остаток {{ contract.outstandingBalance.toLocaleString('ru-RU') }}</div>
              </div>
            </template>
          </VListItem>
        </VList>
      </VCard>
    </div>
  </div>
</template>
