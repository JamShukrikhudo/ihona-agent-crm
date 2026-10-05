<script setup lang="ts">
import { Building2 } from '@lucide/vue'
import { LEAD_STAGE_LABEL, LEAD_STAGES } from '~/stores/useLeadsStore'
import type { Lead, LeadStage, LeadTask } from '~/stores/useLeadsStore'
import { SOURCE_BG, SOURCE_ICON, SOURCE_TEXT, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'

const props = defineProps<{ lead: Lead | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useLeadsStore()
const tasks = ref<LeadTask[]>([])
const loadingTasks = ref(true)
const newTaskTitle = ref('')
const newTaskDue = ref('')
const openClientId = ref<number | null>(null)
const changingStage = ref(false)

const source = computed(() => (props.lead?.source && props.lead.source in SOURCE_ICON ? (props.lead.source as LeadSource) : null))

async function changeStage(stage: LeadStage) {
  if (!props.lead || stage === props.lead.stage) {
    return
  }
  changingStage.value = true
  try {
    const ok = await store.transitionLead(props.lead.id, stage)
    if (!ok) {
      // transitionLead already pushed its own error toast on failure.
    }
  } finally {
    changingStage.value = false
  }
}

function setDueQuick(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  newTaskDue.value = d.toISOString().slice(0, 10)
}

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
    await store.addTask(props.lead.id, title, newTaskDue.value ? new Date(newTaskDue.value).toISOString() : null)
    newTaskTitle.value = ''
    newTaskDue.value = ''
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
          <div class="text-[11px] text-ink-soft">Сделка №{{ lead.id }}</div>
          <div class="font-display text-lg font-bold text-ink">{{ lead.contactName }}</div>
        </div>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="emit('close')" />
      </div>

      <div class="px-5 py-4">
        <UFormField label="Статус" class="mb-3">
          <USelect
            :model-value="lead.stage"
            :disabled="changingStage || lead.stage === 'contracted' || lead.stage === 'lost'"
            :items="(lead.stage === 'lost' ? [...LEAD_STAGES.filter((x) => x !== 'lost'), 'lost'] : LEAD_STAGES.filter((x) => x !== 'lost')).map((s) => ({ label: LEAD_STAGE_LABEL[s], value: s }))"
            class="w-full"
            @update:model-value="changeStage($event as LeadStage)"
          />
        </UFormField>
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

        <UButton
          v-if="lead.clientId"
          color="neutral"
          variant="soft"
          trailing-icon="i-lucide-chevron-right"
          block
          class="mt-3 justify-between"
          @click="openClientId = lead.clientId"
        >
          Полная история клиента
        </UButton>

        <div class="mt-5">
          <div class="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Задачи</div>
          <div v-if="loadingTasks" class="text-[12px] text-ink-soft">Загрузка…</div>
          <template v-else>
            <p v-if="tasks.length === 0" class="text-[12px] text-ink-soft">Задач пока нет.</p>
            <div v-for="task in tasks" :key="task.id" class="mb-1.5 flex items-center gap-2 text-[13px]" :class="task.doneAt ? 'text-ink-soft line-through' : 'text-ink'">
              <UCheckbox
                :model-value="Boolean(task.doneAt)"
                color="success"
                :disabled="Boolean(task.doneAt)"
                @update:model-value="markDone(task)"
              />
              {{ task.title }}
            </div>
          </template>

          <form class="mt-2 space-y-1.5" @submit.prevent="submitTask">
            <div class="flex gap-1.5">
              <UInput v-model="newTaskTitle" placeholder="Например: перезвонить" class="min-w-0 flex-1" />
              <UButton type="submit" icon="i-lucide-plus" :loading="submittingTask" />
            </div>
            <div class="flex items-center gap-1.5">
              <UInput v-model="newTaskDue" type="date" size="sm" />
              <UButton color="neutral" variant="outline" size="xs" @click="setDueQuick(0)">Сегодня</UButton>
              <UButton color="neutral" variant="outline" size="xs" @click="setDueQuick(1)">Завтра</UButton>
            </div>
          </form>
        </div>
      </div>
    </aside>

    <div v-if="openClientId" @click.stop>
      <ClientDrawer :client-id="openClientId" @close="openClientId = null" />
    </div>
  </div>
</template>
