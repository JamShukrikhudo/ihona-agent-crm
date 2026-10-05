<script setup lang="ts">
import { AlertTriangle, CheckCircle2 } from '@lucide/vue'
import { STATUS_BG_SOFT, STATUS_BORDER } from '~/utils/statusStyles'
import type { ImportRow, SkippedRow } from '~/utils/importFields'

const props = defineProps<{ created: ImportRow[]; skipped: SkippedRow[] }>()
defineEmits<{ reset: [] }>()

const expanded = ref(false)

const floors = computed(() => {
  const map = new Map<number, ImportRow[]>()
  for (const unit of props.created) {
    const list = map.get(unit.floor) ?? []
    list.push(unit)
    map.set(unit.floor, list)
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0])
})
</script>

<template>
  <div>
    <div class="mb-5 flex gap-3">
      <VCard variant="tonal" color="success" class="flex-1">
        <VCardText>
          <div class="flex items-center gap-1.5 font-display text-xl font-bold">
            <CheckCircle2 :size="18" /> {{ created.length }}
          </div>
          <div class="mt-0.5 text-[12px] opacity-80">создано</div>
        </VCardText>
      </VCard>
      <VCard :variant="skipped.length > 0 ? 'tonal' : 'outlined'" :color="skipped.length > 0 ? 'error' : undefined" class="flex-1">
        <VCardText>
          <div class="flex items-center gap-1.5 font-display text-xl font-bold">
            <AlertTriangle :size="18" /> {{ skipped.length }}
          </div>
          <div class="mt-0.5 text-[12px] opacity-80">пропущено</div>
        </VCardText>
      </VCard>
    </div>

    <div v-if="skipped.length > 0" class="mb-5">
      <VBtn
        :prepend-icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        color="primary"
        variant="text"
        class="mb-2 px-0"
        @click="expanded = !expanded"
      >
        Почему пропущены строки
      </VBtn>
      <div v-if="expanded" class="overflow-hidden rounded-xl border border-surface-light">
        <div
          v-for="(s, i) in skipped"
          :key="i"
          class="flex justify-between px-3.5 py-2 text-[12px]"
          :class="i < skipped.length - 1 ? 'border-b border-surface-light' : ''"
        >
          <span>Строка {{ s.row }}</span>
          <span class="text-error">{{ s.reasons.join(', ') }}</span>
        </div>
      </div>
    </div>

    <div v-if="created.length > 0">
      <div class="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-medium-emphasis">Так это ляжет в шахматку</div>
      <div class="flex flex-col gap-2">
        <div v-for="[floor, units] in floors" :key="floor" class="flex items-start gap-2.5">
          <div class="flex h-[30px] w-14 shrink-0 items-center justify-center rounded-lg border border-surface-light text-[11px] font-semibold text-medium-emphasis">
            Эт. {{ floor }}
          </div>
          <div class="grid flex-1 gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))">
            <div
              v-for="unit in units"
              :key="unit.row"
              class="rounded-lg border-[1.5px] px-2 py-1.5"
              :class="[STATUS_BG_SOFT[unit.status], STATUS_BORDER[unit.status]]"
            >
              <div class="text-[10px] font-bold text-ink">{{ unit.label ?? `${unit.building}-${unit.floor}` }}</div>
              <div class="text-[9px] text-ink-soft">{{ unit.area }} м²</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <VBtn prepend-icon="mdi-restore" variant="outlined" class="mt-5" @click="$emit('reset')">
      Импортировать другой файл
    </VBtn>
  </div>
</template>
