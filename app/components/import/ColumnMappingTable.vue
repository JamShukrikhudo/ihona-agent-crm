<script setup lang="ts">
import { ChevronRight, FileSpreadsheet } from '@lucide/vue'
import { SYSTEM_FIELDS } from '~/utils/importFields'
import type { ColumnMapping, ParsedSheet } from '~/utils/importFields'

const props = defineProps<{ sheet: ParsedSheet; mapping: ColumnMapping }>()
const emit = defineEmits<{ 'update:mapping': [mapping: ColumnMapping] }>()

const previewRows = computed(() => props.sheet.rows.slice(0, 5))

function setMapping(key: (typeof SYSTEM_FIELDS)[number]['key'], column: string) {
  emit('update:mapping', { ...props.mapping, [key]: column })
}

function previewValue(row: unknown[], key: (typeof SYSTEM_FIELDS)[number]['key']): string {
  const col = props.mapping[key]
  const colIdx = col ? props.sheet.headers.indexOf(col) : -1
  const val = colIdx > -1 ? row[colIdx] : null
  return val === null || val === undefined || val === '' ? '—' : String(val)
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center gap-2 text-[12.5px] text-ink-soft">
      <FileSpreadsheet :size="15" class="text-brand-600" />
      {{ sheet.fileName }} · {{ sheet.rows.length }} строк · автоопределение колонок ниже, поправьте вручную при необходимости
    </div>

    <div class="mb-5 overflow-hidden rounded-2xl border border-line bg-card">
      <div
        v-for="(field, i) in SYSTEM_FIELDS"
        :key="field.key"
        class="flex items-center gap-3 px-4 py-3"
        :class="i < SYSTEM_FIELDS.length - 1 ? 'border-b border-line' : ''"
      >
        <div class="w-36 shrink-0 text-[13px] font-medium text-ink">
          {{ field.label }}<span v-if="field.required" class="text-brand-600"> *</span>
        </div>
        <ChevronRight :size="14" class="shrink-0 text-ink-soft" />
        <select
          :value="mapping[field.key]"
          class="flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
          @change="setMapping(field.key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">— не сопоставлено —</option>
          <option v-for="h in sheet.headers" :key="h" :value="h">{{ h }}</option>
        </select>
      </div>
    </div>

    <div class="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Превью первых строк</div>
    <div class="overflow-x-auto rounded-xl border border-line">
      <table class="w-full border-collapse text-[12.5px]">
        <thead>
          <tr class="bg-paper">
            <th v-for="f in SYSTEM_FIELDS" :key="f.key" class="whitespace-nowrap px-3 py-2 text-left font-semibold text-ink-soft">
              {{ f.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in previewRows" :key="ri" class="border-t border-line">
            <td v-for="f in SYSTEM_FIELDS" :key="f.key" class="whitespace-nowrap px-3 py-2 text-ink">
              {{ previewValue(row, f.key) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
