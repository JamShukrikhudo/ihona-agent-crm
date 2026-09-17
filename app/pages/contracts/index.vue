<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

definePageMeta({ middleware: 'sales-manager' })

const store = useContractsStore()

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Договоры и рассрочка</div>
      <h1 class="font-display text-xl font-bold text-ink">
        {{ store.contracts.length }} договоров
        <span v-if="store.overdueCount > 0" class="ml-2 text-[13px] font-semibold text-status-deposit">· {{ store.overdueCount }} с просрочкой</span>
      </h1>
    </div>

    <div class="mx-auto max-w-4xl px-6 py-6">
      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else-if="store.contracts.length === 0" class="text-sm text-ink-soft">Договоров пока нет.</div>

      <div v-else class="overflow-hidden rounded-xl border border-line bg-card">
        <NuxtLink
          v-for="contract in store.contracts"
          :key="contract.id"
          :to="`/contracts/${contract.id}`"
          class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0 hover:bg-paper"
        >
          <div>
            <div class="flex items-center gap-2 text-[13px] font-semibold text-ink">
              {{ contract.unitLabel ?? `Юнит #${contract.unitId}` }}
              <AlertTriangle v-if="contract.installments?.some((i) => i.overdue)" :size="13" class="text-status-deposit" />
            </div>
            <div class="text-[11px] text-ink-soft">{{ contract.clientName ?? 'Без клиента' }} · подписан {{ new Date(contract.signedAt).toLocaleDateString('ru-RU') }}</div>
          </div>
          <div class="text-right">
            <div class="text-[13px] font-semibold text-ink">{{ contract.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</div>
            <div class="text-[11px] text-ink-soft">остаток {{ contract.outstandingBalance.toLocaleString('ru-RU') }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
