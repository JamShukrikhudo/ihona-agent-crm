<script setup lang="ts">
const props = defineProps<{ unitId: number | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useUnitsStore()
const auth = useAuthStore()
const unit = computed(() => (props.unitId === null ? null : store.byId(props.unitId)))

const releasing = ref(false)
const releaseReason = ref('')
const busy = ref(false)

async function reserve() {
  if (!unit.value) {
    return
  }
  busy.value = true
  await store.optimisticUpdate(
    unit.value.id,
    { status: 'reserved', agent: auth.user?.name ?? null, expiresInHours: 24 },
    () => apiFetch(`/units/${unit.value!.id}/reserve`, { method: 'POST', body: { hours: 24 } }),
  )
  busy.value = false
}

async function confirmRelease() {
  if (!unit.value || releaseReason.value.trim() === '') {
    return
  }
  busy.value = true
  const id = unit.value.id
  const reason = releaseReason.value
  await store.optimisticUpdate(id, { status: 'free', agent: null, expiresInHours: null }, () =>
    apiFetch(`/units/${id}/release`, { method: 'POST', body: { reason } }))
  busy.value = false
  releasing.value = false
  releaseReason.value = ''
}

watch(() => props.unitId, () => {
  releasing.value = false
  releaseReason.value = ''
})

const statusLabel: Record<string, string> = {
  free: 'Свободна',
  reserved: 'Забронирована',
  deposit: 'Внесён задаток',
  sold: 'Продана',
}

// Tailwind's JIT scanner can't see a class name built from a template
// string (`text-status-${status}`) — it never generates the CSS for it.
// Reading the same --color-status-* CSS variable UnitCell uses, inline,
// sidesteps that instead of needing a literal class per status here too.
const statusColor = computed(() => (unit.value ? `var(--color-status-${unit.value.status})` : undefined))
</script>

<template>
  <Transition name="slide">
    <aside v-if="unit" class="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-start justify-between">
        <h2 class="font-display text-lg font-semibold text-brand-800">{{ unit.section }}, {{ unit.floor }} этаж</h2>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <dl class="mt-6 space-y-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-slate-500">Статус</dt>
          <dd class="font-medium" :style="{ color: statusColor }">{{ statusLabel[unit.status] ?? unit.status }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Комнат</dt>
          <dd>{{ unit.rooms === 0 ? 'студия' : unit.rooms }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Площадь</dt>
          <dd>{{ unit.area ?? '—' }} м²</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Цена</dt>
          <dd>{{ unit.price?.toLocaleString('ru-RU') ?? '—' }}</dd>
        </div>
        <div v-if="unit.agent" class="flex justify-between">
          <dt class="text-slate-500">Забронировал</dt>
          <dd>{{ unit.agent }}</dd>
        </div>
        <div v-if="unit.expiresInHours !== null" class="flex justify-between">
          <dt class="text-slate-500">Истекает через</dt>
          <dd>{{ unit.expiresInHours }} ч</dd>
        </div>
      </dl>

      <div class="mt-6 space-y-3">
        <button
          v-if="unit.status === 'free'"
          type="button"
          :disabled="busy"
          class="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          @click="reserve"
        >
          Забронировать на 24ч
        </button>

        <template v-else-if="unit.status === 'reserved'">
          <button
            v-if="!releasing"
            type="button"
            :disabled="busy"
            class="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:hover:bg-red-950"
            @click="releasing = true"
          >
            Снять бронь
          </button>
          <div v-else class="space-y-2">
            <textarea
              v-model="releaseReason"
              placeholder="Причина снятия брони"
              rows="2"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <div class="flex gap-2">
              <button
                type="button"
                :disabled="busy || releaseReason.trim() === ''"
                class="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                @click="confirmRelease"
              >
                Подтвердить
              </button>
              <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="releasing = false">
                Отмена
              </button>
            </div>
          </div>
        </template>

        <p v-else class="text-xs text-slate-400">Действия для этого статуса появятся в следующих спринтах.</p>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
