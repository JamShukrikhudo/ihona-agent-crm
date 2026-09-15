<script setup lang="ts">
import { AlertTriangle, Clock, Layers, Ruler, Users, X } from '@lucide/vue'
import type { Unit } from '~/stores/useUnitsStore'

const props = defineProps<{ unitId: number | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useUnitsStore()
const auth = useAuthStore()
const unit = computed(() => (props.unitId === null ? null : store.byId(props.unitId)))

const releasing = ref(false)
const releaseReason = ref('')
const busy = ref(false)

const STATUS_LABEL: Record<Unit['status'], string> = {
  free: 'Свободно',
  reserved: 'В брони',
  deposit: 'Задаток внесён',
  sold: 'Продано',
}

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

async function reserve() {
  if (!unit.value) {
    return
  }
  busy.value = true
  const id = unit.value.id
  const label = unit.value.label
  const ok = await store.optimisticUpdate(
    id,
    { status: 'reserved', agent: auth.user?.name ?? null, expiresInHours: 24 },
    () => apiFetch(`/units/${id}/reserve`, { method: 'POST', body: { hours: 24 } }),
  )
  busy.value = false
  if (ok) {
    useToastStore().push(`${label} успешно забронирована`, 'success')
  }
  await loadHistory(id)
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
        <span
          class="inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          :style="{ background: `var(--color-status-${unit.status})` }"
        >
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

        <div v-if="unit.status === 'reserved' && unit.expiresInHours !== null" class="mt-3 flex items-center gap-2 rounded-xl p-3" style="background: var(--color-status-reserved-soft)">
          <Clock :size="15" style="color: var(--color-status-reserved)" />
          <div class="text-[12px] text-ink">
            Бронь снимается автоматически через <b>{{ unit.expiresInHours }} ч</b>, если не внесён задаток
          </div>
        </div>

        <div class="mt-5 space-y-2">
          <button
            v-if="unit.status === 'free'"
            type="button"
            :disabled="busy"
            class="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            @click="reserve"
          >
            Забронировать
          </button>

          <template v-else-if="unit.status === 'reserved'">
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
          </template>

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
  </div>
</template>
