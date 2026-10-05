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
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <NuxtLink to="/contracts" class="text-[11px] font-medium text-medium-emphasis hover:text-primary">← Все договоры</NuxtLink>
      <h1 v-if="contract" class="font-display text-xl font-bold">{{ contract.unitLabel ?? `Юнит #${contract.unitId}` }}</h1>
    </div>

    <div v-if="loading" class="px-6 py-6 text-sm text-medium-emphasis">Загрузка…</div>

    <div v-else-if="contract" class="mx-auto max-w-2xl space-y-4 px-6 py-6">
      <div class="grid grid-cols-2 gap-3">
        <VCard variant="outlined">
          <VCardText>
            <div class="text-[11px] text-medium-emphasis">Клиент</div>
            <div class="text-sm font-semibold">{{ contract.clientName ?? '—' }}</div>
          </VCardText>
        </VCard>
        <VCard variant="outlined">
          <VCardText>
            <div class="text-[11px] text-medium-emphasis">Сумма договора</div>
            <div class="text-sm font-semibold">{{ contract.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</div>
          </VCardText>
        </VCard>
        <VCard variant="outlined">
          <VCardText>
            <div class="text-[11px] text-medium-emphasis">Остаток к оплате</div>
            <div class="text-sm font-semibold" :class="contract.outstandingBalance > 0 ? 'text-error' : 'text-success'">
              {{ contract.outstandingBalance.toLocaleString('ru-RU') }} {{ contract.currency }}
            </div>
          </VCardText>
        </VCard>
        <VCard variant="outlined">
          <VCardText>
            <div class="text-[11px] text-medium-emphasis">Подписан</div>
            <div class="text-sm font-semibold">{{ new Date(contract.signedAt).toLocaleDateString('ru-RU') }}</div>
          </VCardText>
        </VCard>
      </div>

      <VCard v-if="contract.installments && contract.installments.length > 0">
        <VCardText>
          <div class="mb-3 font-display text-sm font-bold">График платежей</div>
          <div class="space-y-2">
            <div
              v-for="installment in contract.installments"
              :key="installment.id"
              class="flex items-center justify-between rounded-lg px-3 py-2"
              :class="installment.overdue ? 'bg-error/10' : 'bg-surface-light'"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 v-if="installment.paidAt" :size="15" class="text-success" />
                <Clock v-else :size="15" :class="installment.overdue ? 'text-error' : 'text-medium-emphasis'" />
                <div>
                  <div class="text-[13px] font-medium">Платёж {{ installment.position }}</div>
                  <div class="text-[11px] text-medium-emphasis">
                    до {{ new Date(installment.dueAt).toLocaleDateString('ru-RU') }}
                    <span v-if="installment.overdue" class="font-semibold text-error"> · просрочен</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-[13px] font-semibold">{{ installment.amount.toLocaleString('ru-RU') }} {{ contract.currency }}</span>
                <VBtn v-if="!installment.paidAt" size="small" color="primary" :loading="paying === installment.id" @click="pay(installment.id)">
                  Оплачено
                </VBtn>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </div>
  </div>
</template>
