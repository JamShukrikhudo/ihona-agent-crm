<script setup lang="ts">
import { ArrowRight, X } from '@lucide/vue'
import { autoDetectMapping, buildResult } from '~/utils/importFields'
import type { ColumnMapping, ImportRow, ParsedSheet, SkippedRow } from '~/utils/importFields'

definePageMeta({ middleware: 'permission', permission: 'imports.units' })

const STEP_LABELS = ['Файл', 'Сопоставление', 'Результат']

const step = ref(0)
const sheet = ref<ParsedSheet | null>(null)
const mapping = ref<ColumnMapping>({} as ColumnMapping)
const committing = ref(false)

const projects = ref<{ id: number; name: string }[]>([])
const projectId = ref<number | null>(null)

const finalCreated = ref<ImportRow[]>([])
const finalSkipped = ref<SkippedRow[]>([])

onMounted(async () => {
  const res = await apiFetch<{ data: { id: number; name: string }[] }>('/projects')
  projects.value = res.data
  projectId.value = res.data[0]?.id ?? null
})

function handleParsed(parsed: ParsedSheet) {
  sheet.value = parsed
  mapping.value = autoDetectMapping(parsed.headers)
  step.value = 1
}

function reset() {
  sheet.value = null
  mapping.value = {} as ColumnMapping
  finalCreated.value = []
  finalSkipped.value = []
  step.value = 0
}

async function commit() {
  if (!sheet.value || projectId.value === null) {
    return
  }
  const { created, skipped } = buildResult(sheet.value, mapping.value)

  if (created.length === 0) {
    finalCreated.value = []
    finalSkipped.value = skipped
    step.value = 2
    return
  }

  committing.value = true
  try {
    const res = await apiFetch<{ created: number; skipped: SkippedRow[] }>(`/projects/${projectId.value}/units/import`, {
      method: 'POST',
      body: { units: created },
    })
    const backendSkippedRows = new Set(res.skipped.map((s) => s.row))
    finalCreated.value = created.filter((row) => !backendSkippedRows.has(row.row))
    finalSkipped.value = [...skipped, ...res.skipped].sort((a, b) => a.row - b.row)
  } finally {
    committing.value = false
  }
  step.value = 2
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="mx-auto max-w-2xl px-6 py-8">
      <div class="mb-2 text-[11px] font-medium text-ink-soft">Мастер импорта · Юниты</div>
      <h1 class="mb-6 font-display text-xl font-bold text-ink">Перенос квартир из Excel</h1>

      <div v-if="projects.length > 1 && step === 0" class="mb-4">
        <label class="mb-1 block text-[12px] text-ink-soft">Проект</label>
        <select v-model.number="projectId" class="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink">
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div class="mb-6 flex gap-1.5">
        <div v-for="(label, i) in STEP_LABELS" :key="label" class="flex flex-1 items-center gap-1.5">
          <div
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
            :class="i <= step ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-card text-ink-soft'"
          >
            {{ i + 1 }}
          </div>
          <span class="text-[12px]" :class="i <= step ? 'font-semibold text-ink' : 'text-ink-soft'">{{ label }}</span>
          <div v-if="i < STEP_LABELS.length - 1" class="h-px flex-1 bg-line" />
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-card p-5">
        <ImportFileDropzone v-if="step === 0" @parsed="handleParsed" />

        <template v-else-if="step === 1 && sheet">
          <ImportColumnMappingTable :sheet="sheet" :mapping="mapping" @update:mapping="mapping = $event" />
          <div class="mt-5 flex gap-2.5">
            <button type="button" class="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-paper" @click="reset">
              <X :size="13" /> Отмена
            </button>
            <button
              type="button"
              :disabled="committing"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-[13.5px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              @click="commit"
            >
              {{ committing ? 'Импортирую…' : 'Импортировать' }} <ArrowRight :size="14" />
            </button>
          </div>
        </template>

        <ImportImportSummary v-else-if="step === 2" :created="finalCreated" :skipped="finalSkipped" @reset="reset" />
      </div>
    </div>
  </div>
</template>
