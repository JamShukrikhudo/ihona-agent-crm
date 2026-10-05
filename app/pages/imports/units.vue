<script setup lang="ts">
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
  <div>
    <div class="mx-auto max-w-2xl px-6 py-8">
      <div class="mb-2 text-[11px] font-medium text-medium-emphasis">Мастер импорта · Юниты</div>
      <h1 class="mb-6 font-display text-xl font-bold">Перенос квартир из Excel</h1>

      <VSelect
        v-if="projects.length > 1 && step === 0"
        v-model="projectId"
        :items="projects.map((p) => ({ title: p.name, value: p.id }))"
        label="Проект"
        class="mb-4"
      />

      <div class="mb-6 flex gap-1.5">
        <div v-for="(label, i) in STEP_LABELS" :key="label" class="flex flex-1 items-center gap-1.5">
          <div
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
            :class="i <= step ? 'border-primary bg-primary text-white' : 'border-surface-light bg-surface text-medium-emphasis'"
          >
            {{ i + 1 }}
          </div>
          <span class="text-[12px]" :class="i <= step ? 'font-semibold' : 'text-medium-emphasis'">{{ label }}</span>
          <div v-if="i < STEP_LABELS.length - 1" class="h-px flex-1 bg-surface-light" />
        </div>
      </div>

      <VCard>
        <VCardText>
          <ImportFileDropzone v-if="step === 0" @parsed="handleParsed" />

          <template v-else-if="step === 1 && sheet">
            <ImportColumnMappingTable :sheet="sheet" :mapping="mapping" @update:mapping="mapping = $event" />
            <div class="mt-5 flex gap-2.5">
              <VBtn prepend-icon="mdi-close" variant="outlined" @click="reset">Отмена</VBtn>
              <VBtn append-icon="mdi-arrow-right" color="primary" :loading="committing" block class="flex-1" @click="commit">
                Импортировать
              </VBtn>
            </div>
          </template>

          <ImportImportSummary v-else-if="step === 2" :created="finalCreated" :skipped="finalSkipped" @reset="reset" />
        </VCardText>
      </VCard>
    </div>
  </div>
</template>
