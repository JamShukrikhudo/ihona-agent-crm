<script setup lang="ts">
import { AlertTriangle, Clock, Layers, Ruler, Users } from '@lucide/vue'

const props = defineProps<{ unitId: number | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useUnitsStore()
const auth = useAuthStore()
const unit = computed(() => (props.unitId === null ? null : store.byId(props.unitId)))

const releasing = ref(false)
const releaseReason = ref('')
const busy = ref(false)
const pickingClient = ref(false)

const pricePerSqm = computed(() => (unit.value?.price && unit.value.area ? Math.round(unit.value.price / unit.value.area) : null))

interface HistoryEntry {
  at: string
  who: string
  what: string
}

const history = ref<HistoryEntry[]>([])

async function loadHistory(id: number) {
  try {
    const res = await apiFetch<{ data: HistoryEntry[] }>(`/units/${id}/history`)
    history.value = res.data
  } catch {
    // Best-effort — the panel is still useful without a history list.
    history.value = []
  }
}

// Product rule: no reservation without a client attached. Opens the
// picker first; the actual /reserve call only fires once a client_id is
// resolved (existing client found, or a new one created inline).
function startReserve() {
  pickingClient.value = true
}

async function reserve(clientId: number) {
  pickingClient.value = false
  if (!unit.value) {
    return
  }
  busy.value = true
  const id = unit.value.id
  const label = unit.value.label
  const ok = await store.optimisticUpdate(
    id,
    { status: 'reserved', agent: auth.user?.name ?? null, expiresInHours: 24 },
    () => apiFetch(`/units/${id}/reserve`, { method: 'POST', body: { hours: 24, client_id: clientId } }),
  )
  busy.value = false
  if (ok) {
    useToastStore().push(`${label} успешно забронирована`, 'success')
  }
  await loadHistory(id)
}

async function markDeposit() {
  if (!unit.value) {
    return
  }
  busy.value = true
  const id = unit.value.id
  const ok = await store.optimisticUpdate(id, { status: 'deposit' }, () => apiFetch(`/units/${id}/deposit`, { method: 'POST' }))
  busy.value = false
  if (ok) {
    useToastStore().push('Задаток отмечен внесённым', 'success')
  }
  await loadHistory(id)
}

const creatingContract = ref(false)
const contractAmount = ref<number | null>(null)
const contractInstallments = ref(1)
const contractFirstDueAt = ref('')
const savingContract = ref(false)

async function submitContract() {
  if (!unit.value || !contractAmount.value) {
    return
  }
  savingContract.value = true
  try {
    await useContractsStore().createForUnit(unit.value.id, {
      amount: contractAmount.value,
      installments_count: contractInstallments.value > 1 ? contractInstallments.value : undefined,
      first_installment_due_at: contractFirstDueAt.value || undefined,
    })
    store.patchUnit(unit.value.id, { status: 'sold' })
    creatingContract.value = false
    useToastStore().push('Договор оформлен', 'success')
    await loadHistory(unit.value.id)
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось оформить договор.'
    useToastStore().push(message, 'error')
  } finally {
    savingContract.value = false
  }
}

async function confirmRelease() {
  if (!unit.value || releaseReason.value.trim() === '') {
    return
  }
  busy.value = true
  const id = unit.value.id
  const label = unit.value.label
  const reason = releaseReason.value
  const ok = await store.optimisticUpdate(id, { status: 'free', agent: null, expiresInHours: null }, () =>
    apiFetch(`/units/${id}/release`, { method: 'POST', body: { reason } }))
  busy.value = false
  releasing.value = false
  releaseReason.value = ''
  if (ok) {
    useToastStore().push(`${label} снова свободна`, 'success')
  }
  await loadHistory(id)
}

watch(() => props.unitId, (id) => {
  releasing.value = false
  releaseReason.value = ''
  history.value = []
  if (id !== null) {
    loadHistory(id)
  }
}, { immediate: true })
</script>

<template>
  <USlideover :open="unit !== null" :ui="{ content: 'max-w-sm' }" @update:open="(v) => { if (!v) emit('close') }">
    <template v-if="unit" #content>
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div class="text-[11px] text-ink-soft">Секция {{ unit.section }} · Этаж {{ unit.floor }}</div>
          <div class="font-display text-lg font-bold text-ink">{{ unit.label }}</div>
        </div>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="emit('close')" />
      </div>

      <div class="overflow-y-auto px-5 py-4">
        <UBadge :class="STATUS_BG[unit.status]" class="text-white" :ui="{ base: 'px-2.5 py-1 text-xs font-semibold' }">
          {{ STATUS_LABEL[unit.status] }}
        </UBadge>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <UCard variant="subtle" :ui="{ body: 'p-3' }">
            <Ruler :size="15" class="text-brand-600" />
            <div class="mt-1 text-sm font-semibold text-ink">{{ unit.area }} м²</div>
            <div class="text-[11px] text-ink-soft">{{ unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комнатная` }}</div>
          </UCard>
          <UCard variant="subtle" :ui="{ body: 'p-3' }">
            <Layers :size="15" class="text-brand-600" />
            <div class="mt-1 text-sm font-semibold text-ink">Этаж {{ unit.floor }}</div>
            <div class="text-[11px] text-ink-soft">Секция {{ unit.section }}</div>
          </UCard>
        </div>

        <UCard variant="subtle" class="mt-3" :ui="{ body: 'p-3' }">
          <div class="text-[11px] text-ink-soft">Стоимость</div>
          <div class="font-display text-xl font-bold text-brand-dark">{{ unit.price.toLocaleString('ru-RU') }} TJS</div>
          <div v-if="pricePerSqm" class="text-[11px] text-ink-soft">~{{ pricePerSqm.toLocaleString('ru-RU') }} TJS / м²</div>
        </UCard>

        <UCard v-if="unit.agent" variant="subtle" class="mt-3" :ui="{ body: 'flex items-center gap-2 p-3' }">
          <Users :size="15" class="text-brand-600" />
          <div>
            <div class="text-[11px] text-ink-soft">Закреплено за</div>
            <div class="text-sm font-medium text-ink">{{ unit.agent }}</div>
          </div>
        </UCard>

        <NuxtLink
          v-if="unit.clientId"
          :to="`/clients/${unit.clientId}`"
          class="mt-2 flex items-center gap-2 rounded-xl bg-paper p-3 transition-colors hover:bg-brand-50"
        >
          <Users :size="15" class="text-brand-600" />
          <div>
            <div class="text-[11px] text-ink-soft">Клиент</div>
            <div class="text-sm font-medium text-ink">{{ unit.clientName }}</div>
          </div>
        </NuxtLink>

        <div v-if="unit.status === 'reserved' && unit.expiresInHours !== null" class="mt-3 flex items-center gap-2 rounded-xl p-3 bg-status-reserved-soft">
          <Clock :size="15" class="text-status-reserved" />
          <div class="text-[12px] text-ink">
            Бронь снимается автоматически через <b>{{ unit.expiresInHours }} ч</b>, если не внесён задаток
          </div>
        </div>

        <div class="mt-5 space-y-2">
          <CanAccess v-if="unit.status === 'free'" permission="units.reserve">
            <UButton block :loading="busy" @click="startReserve">Забронировать</UButton>
          </CanAccess>

          <template v-else-if="unit.status === 'reserved'">
            <UButton block :loading="busy" @click="markDeposit">Внести задаток</UButton>
            <CanAccess permission="units.release">
              <UButton
                v-if="!releasing"
                icon="i-lucide-alert-triangle"
                color="neutral"
                variant="outline"
                block
                :disabled="busy"
                @click="releasing = true"
              >
                Снять бронь
              </UButton>
              <div v-else class="space-y-2">
                <UTextarea v-model="releaseReason" placeholder="Причина снятия брони" :rows="2" class="w-full" />
                <div class="flex gap-2">
                  <UButton
                    color="error"
                    class="flex-1 justify-center"
                    :loading="busy"
                    :disabled="releaseReason.trim() === ''"
                    @click="confirmRelease"
                  >
                    Подтвердить
                  </UButton>
                  <UButton color="neutral" variant="outline" @click="releasing = false">Отмена</UButton>
                </div>
              </div>
            </CanAccess>
          </template>

          <template v-else-if="unit.status === 'deposit'">
            <UButton v-if="!creatingContract" block @click="creatingContract = true; contractAmount = unit.price">
              Оформить договор
            </UButton>
            <div v-else class="space-y-2">
              <UFormField label="Сумма договора">
                <UInput v-model.number="contractAmount" type="number" :min="1" class="w-full" />
              </UFormField>
              <UFormField label="Рассрочка на, мес. (1 — единовременно)">
                <UInput v-model.number="contractInstallments" type="number" :min="1" :max="60" class="w-full" />
              </UFormField>
              <UFormField v-if="contractInstallments > 1" label="Дата первого платежа">
                <UInput v-model="contractFirstDueAt" type="date" class="w-full" />
              </UFormField>
              <div class="flex gap-2">
                <UButton class="flex-1 justify-center" :loading="savingContract" :disabled="!contractAmount" @click="submitContract">
                  Подтвердить
                </UButton>
                <UButton color="neutral" variant="outline" @click="creatingContract = false">Отмена</UButton>
              </div>
            </div>
          </template>

          <UButton
            v-else-if="unit.status === 'sold' && unit.contractId"
            :to="`/contracts/${unit.contractId}`"
            color="neutral"
            variant="outline"
            block
          >
            Открыть договор
          </UButton>

          <p v-else class="text-[12px] text-ink-soft">Действия для этого статуса появятся в следующих спринтах.</p>
        </div>

        <div v-if="history.length > 0" class="mt-6">
          <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">История</div>
          <div class="space-y-2">
            <div v-for="(h, i) in history" :key="i" class="flex justify-between border-b border-line pb-2 text-[12px]">
              <span class="text-ink">{{ h.what }}</span>
              <span class="text-ink-soft">{{ h.at }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <ClientPicker v-if="pickingClient" @select="(client) => reserve(client.id)" @cancel="pickingClient = false" />
</template>
