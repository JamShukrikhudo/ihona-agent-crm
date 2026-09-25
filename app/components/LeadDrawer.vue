<script setup lang="ts">
import { Building2, Check, ChevronRight, Plus, X } from '@lucide/vue'
import { LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import type { Lead, LeadTask } from '~/stores/useLeadsStore'
import { SOURCE_BG, SOURCE_ICON, SOURCE_TEXT, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'

const props = defineProps<{ lead: Lead | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useLeadsStore()
const tasks = ref<LeadTask[]>([])
const loadingTasks = ref(true)
const newTaskTitle = ref('')

const source = computed(() => (props.lead?.source && props.lead.source in SOURCE_ICON ? (props.lead.source as LeadSource) : null))

async function loadTasks(leadId: number) {
  loadingTasks.value = true
  try {
    const res = await apiFetch<{ tasks: LeadTask[] }>(`/leads/${leadId}`)
    tasks.value = res.tasks
  } finally {
    loadingTasks.value = false
  }
}

watch(() => props.lead?.id, (id) => {
  tasks.value = []
  if (id) {
    loadTasks(id)
  }
}, { immediate: true })

const submittingTask = ref(false)

async function submitTask() {
  const title = newTaskTitle.value.trim()
  if (title === '' || !props.lead) {
    return
  }
  submittingTask.value = true
  try {
    await store.addTask(props.lead.id, title, null)
    newTaskTitle.value = ''
    await loadTasks(props.lead.id)
  } catch {
    useToastStore().push('Не удалось добавить задачу', 'error')
  } finally {
    submittingTask.value = false
  }
}

async function markDone(task: LeadTask) {
  if (!props.lead) {
    return
  }
  try {
    await store.completeTask(props.lead.id, task.id)
    task.doneAt = new Date().toISOString()
    await loadTasks(props.lead.id)
  } catch {
    useToastStore().push('Не удалось отметить задачу выполненной', 'error')
  }
}
</script>

<template>
  <div v-if="lead" class="fixed inset-0 z-40 flex justify-end bg-black/25" @click="emit('close')">
    <aside class="h-full w-full max-w-sm overflow-y-auto bg-card shadow-2xl" @click.stop>
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div class="text-[11px] text-ink-soft">{{ LEAD_STAGE_LABEL[lead.stage] }}</div>
          <div class="font-display text-lg font-bold text-ink">{{ lead.contactName }}</div>
        </div>
        <button type="button" class="rounded-full p-1.5 hover:bg-paper" @click="emit('close')">
          <X :size="18" class="text-ink-soft" />
        </button>
      </div>

      <div class="px-5 py-4">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span
            v-if="source"
            class="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
            :class="[SOURCE_BG[source], SOURCE_TEXT[source]]"
          >
            <component :is="SOURCE_ICON[source]" :size="11" /> {{ sourceLabel(lead.source) }}
          </span>
          <span v-if="lead.unitLabel" class="flex items-center gap-1 rounded-full bg-status-free-soft px-2 py-1 text-[11px] font-semibold text-brand-dark">
            <Building2 :size="11" /> {{ lead.buildingName ? `${lead.buildingName}, ` : '' }}{{ lead.unitLabel }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div class="rounded-xl bg-paper p-3">
            <div class="text-[10.5px] text-ink-soft">Телефон</div>
            <div class="text-[13px] font-semibold text-ink">{{ lead.contactPhone ?? '—' }}</div>
          </div>
          <div class="rounded-xl bg-paper p-3">
            <div class="text-[10.5px] text-ink-soft">Бюджет</div>
            <div class="text-[13px] font-semibold text-ink">{{ lead.unitPrice ? `${lead.unitPrice.toLocaleString('ru-RU')} TJS` : '—' }}</div>
          </div>
        </div>

        <NuxtLink
          v-if="lead.clientId"
          :to="`/clients/${lead.clientId}`"
          class="mt-3 flex items-center justify-between rounded-xl bg-paper p-3 text-[12px] font-medium text-ink hover:bg-brand-50"
        >
          Полная история клиента
          <ChevronRight :size="14" class="text-ink-soft" />
        </NuxtLink>

        <div class="mt-5">
          <div class="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Задачи</div>
          <div v-if="loadingTasks" class="text-[12px] text-ink-soft">Загрузка…</div>
          <template v-else>
            <p v-if="tasks.length === 0" class="text-[12px] text-ink-soft">Задач пока нет.</p>
            <div v-for="task in tasks" :key="task.id" class="mb-1.5 flex items-center gap-2 text-[13px]" :class="task.doneAt ? 'text-ink-soft line-through' : 'text-ink'">
              <button
                type="button"
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                :class="task.doneAt ? 'border-status-free bg-status-free text-white' : 'border-line'"
                :disabled="Boolean(task.doneAt)"
                @click="markDone(task)"
              >
                <Check v-if="task.doneAt" :size="10" />
              </button>
              {{ task.title }}
            </div>
          </template>

          <form class="mt-2 flex gap-1.5" @submit.prevent="submitTask">
            <input
              v-model="newTaskTitle"
              type="text"
              placeholder="Например: перезвонить завтра"
              class="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[12.5px] text-ink"
            />
            <button type="submit" :disabled="submittingTask" class="flex items-center justify-center rounded-lg bg-brand-600 px-2.5 text-white disabled:opacity-60">
              <Plus :size="14" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  </div>
</template>
