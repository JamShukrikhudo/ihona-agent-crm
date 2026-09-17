<script setup lang="ts">
import { AlertTriangle, Upload } from '@lucide/vue'
import * as XLSX from 'xlsx'
import type { ParsedSheet } from '~/utils/importFields'

const emit = defineEmits<{ parsed: [sheet: ParsedSheet] }>()

const dragOver = ref(false)
const error = ref<string | null>(null)

function handleFile(file: File | null | undefined) {
  error.value = null
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target?.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]!]!
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' })
      if (rows.length === 0) {
        throw new Error('empty')
      }
      const headers = (rows[0] as unknown[]).map((h) => String(h))
      const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== ''))
      emit('parsed', { fileName: file.name, headers, rows: dataRows })
    } catch {
      error.value = 'Не удалось прочитать файл — проверьте, что это .xlsx или .csv с заголовками в первой строке.'
    }
  }
  reader.readAsArrayBuffer(file)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  handleFile(e.dataTransfer?.files[0])
}
</script>

<template>
  <div>
    <div
      class="rounded-2xl border-[1.5px] border-dashed p-12 text-center transition-colors"
      :class="dragOver ? 'border-brand-600 bg-brand-50' : 'border-line bg-card'"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper">
        <Upload :size="22" class="text-brand-600" />
      </div>
      <div class="mb-1 text-[15px] font-semibold text-ink">Перетащите Excel-файл сюда</div>
      <div class="mb-4 text-[12.5px] text-ink-soft">.xlsx, .xls или .csv — квартиры со своей шахматки, как есть</div>
      <label class="inline-block cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-brand-700">
        Выбрать файл
        <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="handleFile(($event.target as HTMLInputElement).files?.[0])" />
      </label>
    </div>

    <div v-if="error" class="mt-3 flex items-start gap-2 rounded-lg bg-status-deposit-soft px-3 py-2.5 text-[12.5px] text-status-deposit">
      <AlertTriangle :size="15" class="mt-0.5 shrink-0" />
      {{ error }}
    </div>
  </div>
</template>
