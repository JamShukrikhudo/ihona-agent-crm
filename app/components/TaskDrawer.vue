<script setup lang="ts">
import { Trash2, X } from '@lucide/vue'
import { useBoardStore } from '~/stores/useBoardStore'
import type { BoardTask } from '~/stores/useBoardStore'
import type { TeamAgent } from '~/stores/useClientsStore'

const props = defineProps<{ task: BoardTask | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useBoardStore()
const toast = useToastStore()
const clientsStore = useClientsStore()

const title = ref('')
const description = ref('')
const assigneeId = ref<number | ''>('')
const dueAt = ref('')
const saving = ref(false)
const teamAgents = ref<TeamAgent[]>([])

watch(
  () => props.task,
  (task) => {
    if (!task) return
    title.value = task.title
    description.value = task.description ?? ''
    assigneeId.value = task.assigneeId ?? ''
    dueAt.value = task.dueAt ? task.dueAt.slice(0, 10) : ''
  },
  { immediate: true },
)

onMounted(() => {
  clientsStore.fetchTeamAgents().then((agents) => { teamAgents.value = agents })
})

async function save() {
  if (!props.task || title.value.trim() === '') return
  saving.value = true
  try {
    await store.updateTask(props.task.id, {
      title: title.value.trim(),
      description: description.value.trim() || null,
      assignee_id: assigneeId.value === '' ? null : Number(assigneeId.value),
      due_at: dueAt.value || null,
    })
    toast.push('Сохранено', 'success')
  } catch {
    toast.push('Не удалось сохранить', 'error')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.task) return
  if (!confirm('Удалить задачу?')) return
  await store.deleteTask(props.task.id)
  emit('close')
}
</script>

<template>
  <div v-if="task" class="fixed inset-0 z-40 flex justify-end bg-ink/30" @click.self="$emit('close')">
    <div class="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-sm font-bold text-ink">Задача</h2>
        <button type="button" class="text-ink-soft hover:text-ink" @click="$emit('close')"><X :size="18" /></button>
      </div>

      <div class="space-y-3">
        <label class="block text-[12px] text-ink-soft">
          Заголовок
          <input v-model="title" type="text" class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>

        <label class="block text-[12px] text-ink-soft">
          Описание
          <textarea v-model="description" rows="4" class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>

        <label class="block text-[12px] text-ink-soft">
          Исполнитель
          <select v-model="assigneeId" class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink">
            <option value="">Не назначен</option>
            <option v-for="agent in teamAgents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
          </select>
        </label>

        <label class="block text-[12px] text-ink-soft">
          Срок
          <input v-model="dueAt" type="date" class="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            :disabled="saving || title.trim() === ''"
            class="flex-1 rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            @click="save"
          >
            {{ saving ? 'Сохраняю…' : 'Сохранить' }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center rounded-lg border border-line px-3 text-status-deposit hover:bg-paper"
            title="Удалить"
            @click="remove"
          >
            <Trash2 :size="16" />
          </button>
        </div>

        <p class="pt-1 text-[11px] text-ink-soft">
          Создал: {{ task.createdByName ?? '—' }} · {{ new Date(task.createdAt).toLocaleDateString('ru-RU') }}
        </p>
      </div>
    </div>
  </div>
</template>
