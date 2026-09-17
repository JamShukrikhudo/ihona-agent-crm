<script setup lang="ts">
import { CheckCircle2, Clock } from '@lucide/vue'
import type { Contract } from '~/stores/useContractsStore'

definePageMeta({ middleware: 'sales-manager' })

const route = useRoute()
const contractId = computed(() => Number(route.params.id))
const store = useContractsStore()

const contract = ref<Contract | null>(null)
const loading = ref(true)
const paying = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    contract.value = await store.fetchOne(contractId.value)
  } finally {
    loading.value = false
  }
}

async function pay(installmentId: number) {
  paying.value = installmentId
  try {
    const updated = await store.payInstallment(installmentId)
    const installment = contract.value?.installments?.find((i) => i.id === installmentId)
    if (installment) {
      Object.assign(installment, updated)
    }
    if (contract.value) {
      contract.value.outstandingBalance = (contract.value.installments ?? []).filter((i) => !i.paidAt).reduce((sum, i) => sum + i.amount, 0)
    }
    useToastStore().push('Платёж отмечен оплаченным', 'success')
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось отметить платёж.'
    useToastStore().push(message, 'error')
  } finally {
    paying.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <NuxtLink to="/contracts" class="text-[11px] font-medium text-ink-soft hover:text-brand-600">← Все договоры</NuxtLink>
      <h1 v-if="contract" class="font-display text-xl font-bold text-ink">{{ contract.unitLabel ?? `Юнит #${contract.unitId}` }}</h1>
    </div>

    <div v-if="loading" class="px-6 py-6 text-sm text-ink-soft">Загрузка…</div>

    <div v-else-if="contract" class="mx-auto max-w-2xl space-y-4 px-6 py-6">
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Клиент</div>
          <div class="text-sm font-semibold text-ink">{{ contract.clientName ?? '—' }}</div>
        </div>
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Сумма договора</div>
          <div class="text-sm font-semibold text-ink">{{ contract.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</div>
        </div>
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Остаток к оплате</div>
          <div class="text-sm font-semibold" :class="contract.outstandingBalance > 0 ? 'text-status-deposit' : 'text-status-free'">
            {{ contract.outstandingBalance.toLocaleString('ru-RU') }} {{ contract.currency }}
          </div>
        </div>
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="text-[11px] text-ink-soft">Подписан</div>
          <div class="text-sm font-semibold text-ink">{{ new Date(contract.signedAt).toLocaleDateString('ru-RU') }}</div>
        </div>
      </div>

      <div v-if="contract.installments && contract.installments.length > 0" class="rounded-xl border border-line bg-card p-4">
        <div class="mb-3 font-display text-sm font-bold text-ink">График платежей</div>
        <div class="space-y-2">
          <div
            v-for="installment in contract.installments"
            :key="installment.id"
            class="flex items-center justify-between rounded-lg px-3 py-2"
            :class="installment.overdue ? 'bg-status-deposit-soft' : 'bg-paper'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="installment.paidAt" :size="15" class="text-status-free" />
              <Clock v-else :size="15" :class="installment.overdue ? 'text-status-deposit' : 'text-ink-soft'" />
              <div>
                <div class="text-[13px] font-medium text-ink">Платёж {{ installment.position }}</div>
                <div class="text-[11px] text-ink-soft">
                  до {{ new Date(installment.dueAt).toLocaleDateString('ru-RU') }}
                  <span v-if="installment.overdue" class="font-semibold text-status-deposit"> · просрочен</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[13px] font-semibold text-ink">{{ installment.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</span>
              <button
                v-if="!installment.paidAt"
                type="button"
                :disabled="paying === installment.id"
                class="rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                @click="pay(installment.id)"
              >
                {{ paying === installment.id ? '…' : 'Оплачено' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
