<script setup lang="ts">
import { AlertTriangle, Clock, Layers, Ruler, Users, X } from '@lucide/vue'

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
  <div v-if="unit" class="fixed inset-0 z-40 flex justify-end bg-black/25" @click="emit('close')">
    <aside class="h-full w-full max-w-sm overflow-y-auto bg-card shadow-2xl" @click.stop>
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div class="text-[11px] text-ink-soft">Секция {{ unit.section }} · Этаж {{ unit.floor }}</div>
          <div class="font-display text-lg font-bold text-ink">{{ unit.label }}</div>
        </div>
        <button type="button" class="rounded-full p-1.5 hover:bg-slate-100" @click="emit('close')">
          <X :size="18" class="text-ink-soft" />
        </button>
      </div>

      <div class="px-5 py-4">
        <span class="inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-white" :class="STATUS_BG[unit.status]">
          {{ STATUS_LABEL[unit.status] }}
        </span>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-paper p-3">
            <Ruler :size="15" class="text-brand-600" />
            <div class="mt-1 text-sm font-semibold text-ink">{{ unit.area }} м²</div>
            <div class="text-[11px] text-ink-soft">{{ unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комнатная` }}</div>
          </div>
          <div class="rounded-xl bg-paper p-3">
            <Layers :size="15" class="text-brand-600" />
            <div class="mt-1 text-sm font-semibold text-ink">Этаж {{ unit.floor }}</div>
            <div class="text-[11px] text-ink-soft">Секция {{ unit.section }}</div>
          </div>
        </div>

        <div class="mt-3 rounded-xl bg-paper p-3">
          <div class="text-[11px] text-ink-soft">Стоимость</div>
          <div class="font-display text-xl font-bold text-brand-dark">{{ unit.price.toLocaleString('ru-RU') }} TJS</div>
          <div v-if="pricePerSqm" class="text-[11px] text-ink-soft">~{{ pricePerSqm.toLocaleString('ru-RU') }} TJS / м²</div>
        </div>

        <div v-if="unit.agent" class="mt-3 flex items-center gap-2 rounded-xl bg-paper p-3">
          <Users :size="15" class="text-brand-600" />
          <div>
            <div class="text-[11px] text-ink-soft">Закреплено за</div>
            <div class="text-sm font-medium text-ink">{{ unit.agent }}</div>
          </div>
        </div>

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
            <button
              type="button"
              :disabled="busy"
              class="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              @click="startReserve"
            >
              Забронировать
            </button>
          </CanAccess>

          <template v-else-if="unit.status === 'reserved'">
            <button
              type="button"
              :disabled="busy"
              class="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              @click="markDeposit"
            >
              Внести задаток
            </button>
            <CanAccess permission="units.release">
              <button
                v-if="!releasing"
                type="button"
                :disabled="busy"
                class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 disabled:opacity-60"
                @click="releasing = true"
              >
                <AlertTriangle :size="14" /> Снять бронь
              </button>
              <div v-else class="space-y-2">
                <textarea
                  v-model="releaseReason"
                  placeholder="Причина снятия брони"
                  rows="2"
                  class="w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    :disabled="busy || releaseReason.trim() === ''"
                    class="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    @click="confirmRelease"
                  >
                    Подтвердить
                  </button>
                  <button type="button" class="rounded-xl border border-line px-3 py-2 text-sm" @click="releasing = false">
                    Отмена
                  </button>
                </div>
              </div>
            </CanAccess>
          </template>

          <template v-else-if="unit.status === 'deposit'">
            <button
              v-if="!creatingContract"
              type="button"
              class="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              @click="creatingContract = true; contractAmount = unit.price"
            >
              Оформить договор
            </button>
            <div v-else class="space-y-2">
              <label class="block text-[11px] text-ink-soft">
                Сумма договора
                <input v-model.number="contractAmount" type="number" min="1" class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
              </label>
              <label class="block text-[11px] text-ink-soft">
                Рассрочка на, мес. (1 — единовременно)
                <input v-model.number="contractInstallments" type="number" min="1" max="60" class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
              </label>
              <label v-if="contractInstallments > 1" class="block text-[11px] text-ink-soft">
                Дата первого платежа
                <input v-model="contractFirstDueAt" type="date" class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
              </label>
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="savingContract || !contractAmount"
                  class="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  @click="submitContract"
                >
                  {{ savingContract ? 'Оформляю…' : 'Подтвердить' }}
                </button>
                <button type="button" class="rounded-xl border border-line px-3 py-2 text-sm" @click="creatingContract = false">
                  Отмена
                </button>
              </div>
            </div>
          </template>

          <NuxtLink
            v-else-if="unit.status === 'sold' && unit.contractId"
            :to="`/contracts/${unit.contractId}`"
            class="block w-full rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-ink hover:bg-paper"
          >
            Открыть договор
          </NuxtLink>

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
    </aside>

    <ClientPicker v-if="pickingClient" @select="(client) => reserve(client.id)" @cancel="pickingClient = false" />
  </div>
</template>
