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
  <VNavigationDrawer
    :model-value="unit !== null"
    location="end"
    temporary
    width="384"
    @update:model-value="(v: boolean) => { if (!v) emit('close') }"
  >
    <template v-if="unit">
      <div class="flex items-center justify-between border-b border-surface-light px-5 py-4">
        <div>
          <div class="text-[11px] text-medium-emphasis">Секция {{ unit.section }} · Этаж {{ unit.floor }}</div>
          <div class="font-display text-lg font-bold">{{ unit.label }}</div>
        </div>
        <VBtn icon="mdi-close" color="default" variant="text" size="small" @click="emit('close')" />
      </div>

      <div class="overflow-y-auto px-5 py-4">
        <VChip :class="STATUS_BG[unit.status]" class="text-white" size="small" label>
          {{ STATUS_LABEL[unit.status] }}
        </VChip>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <VCard variant="tonal">
            <VCardText class="p-3">
              <Ruler :size="15" class="text-primary" />
              <div class="mt-1 text-sm font-semibold">{{ unit.area }} м²</div>
              <div class="text-[11px] text-medium-emphasis">{{ unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комнатная` }}</div>
            </VCardText>
          </VCard>
          <VCard variant="tonal">
            <VCardText class="p-3">
              <Layers :size="15" class="text-primary" />
              <div class="mt-1 text-sm font-semibold">Этаж {{ unit.floor }}</div>
              <div class="text-[11px] text-medium-emphasis">Секция {{ unit.section }}</div>
            </VCardText>
          </VCard>
        </div>

        <VCard variant="tonal" class="mt-3">
          <VCardText class="p-3">
            <div class="text-[11px] text-medium-emphasis">Стоимость</div>
            <div class="font-display text-xl font-bold text-primary">{{ unit.price.toLocaleString('ru-RU') }} TJS</div>
            <div v-if="pricePerSqm" class="text-[11px] text-medium-emphasis">~{{ pricePerSqm.toLocaleString('ru-RU') }} TJS / м²</div>
          </VCardText>
        </VCard>

        <VCard v-if="unit.agent" variant="tonal" class="mt-3">
          <VCardText class="flex items-center gap-2 p-3">
            <Users :size="15" class="text-primary" />
            <div>
              <div class="text-[11px] text-medium-emphasis">Закреплено за</div>
              <div class="text-sm font-medium">{{ unit.agent }}</div>
            </div>
          </VCardText>
        </VCard>

        <NuxtLink
          v-if="unit.clientId"
          :to="`/clients/${unit.clientId}`"
          class="mt-2 flex items-center gap-2 rounded-xl bg-surface-light p-3 transition-colors hover:bg-primary/10"
        >
          <Users :size="15" class="text-primary" />
          <div>
            <div class="text-[11px] text-medium-emphasis">Клиент</div>
            <div class="text-sm font-medium">{{ unit.clientName }}</div>
          </div>
        </NuxtLink>

        <VAlert v-if="unit.status === 'reserved' && unit.expiresInHours !== null" type="warning" variant="tonal" class="mt-3" density="compact">
          <div class="text-[12px]">
            Бронь снимается автоматически через <b>{{ unit.expiresInHours }} ч</b>, если не внесён задаток
          </div>
        </VAlert>

        <div class="mt-5 space-y-2">
          <CanAccess v-if="unit.status === 'free'" permission="units.reserve">
            <VBtn color="primary" block :loading="busy" @click="startReserve">Забронировать</VBtn>
          </CanAccess>

          <template v-else-if="unit.status === 'reserved'">
            <VBtn color="primary" block :loading="busy" @click="markDeposit">Внести задаток</VBtn>
            <CanAccess permission="units.release">
              <VBtn
                v-if="!releasing"
                prepend-icon="mdi-alert-outline"
                color="default"
                variant="outlined"
                block
                :disabled="busy"
                @click="releasing = true"
              >
                Снять бронь
              </VBtn>
              <div v-else class="space-y-2">
                <VTextarea v-model="releaseReason" placeholder="Причина снятия брони" rows="2" />
                <div class="flex gap-2">
                  <VBtn
                    color="error"
                    class="flex-1 justify-center"
                    :loading="busy"
                    :disabled="releaseReason.trim() === ''"
                    @click="confirmRelease"
                  >
                    Подтвердить
                  </VBtn>
                  <VBtn variant="outlined" @click="releasing = false">Отмена</VBtn>
                </div>
              </div>
            </CanAccess>
          </template>

          <template v-else-if="unit.status === 'deposit'">
            <VBtn v-if="!creatingContract" color="primary" block @click="creatingContract = true; contractAmount = unit.price">
              Оформить договор
            </VBtn>
            <div v-else class="space-y-2">
              <VTextField v-model.number="contractAmount" type="number" :min="1" label="Сумма договора" />
              <VTextField v-model.number="contractInstallments" type="number" :min="1" :max="60" label="Рассрочка на, мес. (1 — единовременно)" />
              <VTextField v-if="contractInstallments > 1" v-model="contractFirstDueAt" type="date" label="Дата первого платежа" />
              <div class="flex gap-2">
                <VBtn color="primary" class="flex-1 justify-center" :loading="savingContract" :disabled="!contractAmount" @click="submitContract">
                  Подтвердить
                </VBtn>
                <VBtn variant="outlined" @click="creatingContract = false">Отмена</VBtn>
              </div>
            </div>
          </template>

          <VBtn
            v-else-if="unit.status === 'sold' && unit.contractId"
            :to="`/contracts/${unit.contractId}`"
            color="default"
            variant="outlined"
            block
          >
            Открыть договор
          </VBtn>

          <p v-else class="text-[12px] text-medium-emphasis">Действия для этого статуса появятся в следующих спринтах.</p>
        </div>

        <div v-if="history.length > 0" class="mt-6">
          <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-medium-emphasis">История</div>
          <div class="space-y-2">
            <div v-for="(h, i) in history" :key="i" class="flex justify-between border-b border-surface-light pb-2 text-[12px]">
              <span>{{ h.what }}</span>
              <span class="text-medium-emphasis">{{ h.at }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </VNavigationDrawer>

  <ClientPicker v-if="pickingClient" @select="(client) => reserve(client.id)" @cancel="pickingClient = false" />
</template>
