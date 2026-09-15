<script setup lang="ts">
import { Building2, Check, ClipboardList, Phone, Plus } from '@lucide/vue'
import type { Lead, LeadTask } from '~/stores/useLeadsStore'

const props = defineProps<{ lead: Lead }>()

const store = useLeadsStore()
const tasksOpen = ref(false)
const tasks = ref<LeadTask[]>([])
const loadingTasks = ref(false)
const newTaskTitle = ref('')

async function loadTasks() {
  loadingTasks.value = true
  try {
    const res = await apiFetch<{ tasks: LeadTask[] }>(`/leads/${props.lead.id}`)
    tasks.value = res.tasks
  } finally {
    loadingTasks.value = false
  }
}

async function toggleTasks() {
  tasksOpen.value = !tasksOpen.value
  if (tasksOpen.value) {
    await loadTasks()
  }
}

async function submitTask() {
  const title = newTaskTitle.value.trim()
  if (title === '') {
    return
  }
  await store.addTask(props.lead.id, title, null)
  newTaskTitle.value = ''
  await loadTasks()
}

async function markDone(task: LeadTask) {
  await store.completeTask(props.lead.id, task.id)
  task.doneAt = new Date().toISOString()
}
</script>

<template>
  <div
    class="cursor-grab space-y-2 rounded-xl border border-line bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
    :class="{ 'opacity-60': lead.stage === 'lost' }"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="font-semibold text-ink">{{ lead.contactName }}</div>
      <div v-if="lead.openTasksCount > 0" class="flex items-center gap-1 rounded-full bg-status-reserved-soft px-2 py-0.5 text-[11px] font-semibold text-status-reserved">
        <ClipboardList :size="12" /> {{ lead.openTasksCount }}
      </div>
    </div>

    <div v-if="lead.contactPhone" class="flex items-center gap-1.5 text-[12px] text-ink-soft">
      <Phone :size="12" /> {{ lead.contactPhone }}
    </div>

    <div v-if="lead.unitLabel" class="flex items-center gap-1.5 text-[12px] text-ink-soft">
      <Building2 :size="12" /> {{ lead.buildingName ? `${lead.buildingName}, ` : '' }}{{ lead.unitLabel }}
    </div>

    <div v-if="lead.agent" class="text-[11px] text-ink-soft">Агент: {{ lead.agent }}</div>

    <button type="button" class="text-[11px] font-medium text-brand-600 hover:underline" draggable="false" @click.stop="toggleTasks" @pointerdown.stop>
      {{ tasksOpen ? 'Скрыть задачи' : 'Задачи' }}
    </button>

    <div v-if="tasksOpen" class="space-y-1.5 rounded-lg bg-paper p-2" @click.stop @pointerdown.stop>
      <div v-if="loadingTasks" class="text-[11px] text-ink-soft">Загрузка…</div>
      <template v-else>
        <div v-if="tasks.length === 0" class="text-[11px] text-ink-soft">Задач пока нет.</div>
        <div v-for="task in tasks" :key="task.id" class="flex items-center gap-2 text-[12px]" :class="task.doneAt ? 'text-ink-soft line-through' : 'text-ink'">
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

      <form class="flex gap-1.5 pt-1" @submit.prevent="submitTask">
        <input
          v-model="newTaskTitle"
          type="text"
          placeholder="Новая задача"
          class="min-w-0 flex-1 rounded-md border border-line px-2 py-1 text-[12px] text-ink"
        />
        <button type="submit" class="flex items-center justify-center rounded-md bg-brand-600 px-2 text-white">
          <Plus :size="14" />
        </button>
      </form>
    </div>
  </div>
</template>
