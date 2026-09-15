<script setup lang="ts">
const props = defineProps<{ unitId: number | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useUnitsStore()
const unit = computed(() => (props.unitId === null ? null : store.byId(props.unitId)))

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

      <p class="mt-6 text-xs text-slate-400">
        Бронирование и снятие брони появятся в Спринте 2 — сейчас карточка
        только для просмотра.
      </p>
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
