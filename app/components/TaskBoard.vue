<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { TASK_STATUSES, TASK_STATUS_ACCENT, TASK_STATUS_LABEL, useBoardStore } from '~/stores/useBoardStore'
import type { BoardTask, TaskStatus } from '~/stores/useBoardStore'

const store = useBoardStore()
const openedTask = ref<BoardTask | null>(null)

// Same reasoning as DealsBoard: vue-draggable-plus needs its own mutable
// array per column, rebuilt from the store whenever it changes.
const columns = reactive<Record<TaskStatus, BoardTask[]>>(
  Object.fromEntries(TASK_STATUSES.map((status) => [status, []])) as Record<TaskStatus, BoardTask[]>,
)

function syncFromStore() {
  for (const status of TASK_STATUSES) {
    columns[status] = store.byStatus(status)
  }
}

watch(() => store.tasks, syncFromStore, { deep: true })
onMounted(async () => {
  await store.fetchTasks()
  syncFromStore()
})

/** Same single-moved-card reconciliation as DealsBoard's onDragEnd — only
 * the column that gained a card out of step with its own `status` needs
 * a call; the column a card left needs none (see useBoardStore.reorder). */
async function onDragEnd() {
  for (const status of TASK_STATUSES) {
    if (columns[status].some((t) => t.status !== status) || columns[status].length !== store.byStatus(status).length) {
      await store.reorder(status, columns[status].map((t) => t.id))
      syncFromStore()
      return
    }
  }
}

const creatingIn = ref<TaskStatus | null>(null)
const newTitle = ref('')
async function submitNewTask() {
  if (newTitle.value.trim() === '' || !creatingIn.value) return
  await store.createTask({ title: newTitle.value.trim(), status: creatingIn.value })
  newTitle.value = ''
  creatingIn.value = null
  syncFromStore()
}
</script>

<template>
  <div v-if="store.loading" class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="status in TASK_STATUSES" :key="status" class="w-72 shrink-0 space-y-2 rounded-2xl bg-paper p-3">
      <div class="h-4 w-24 animate-pulse rounded bg-card" />
      <div class="h-20 animate-pulse rounded-xl bg-card" />
    </div>
  </div>

  <div v-else class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="status in TASK_STATUSES" :key="status" class="flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl bg-paper pb-3">
      <div class="h-1 shrink-0" :class="TASK_STATUS_ACCENT[status]" />
      <div class="flex items-center justify-between px-3 pt-2">
        <div class="font-display text-sm font-bold text-ink">{{ TASK_STATUS_LABEL[status] }}</div>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{{ columns[status].length }}</span>
      </div>

      <VueDraggable
        v-model="columns[status]"
        :animation="150"
        group="tasks-board"
        class="flex min-h-[80px] flex-col gap-2 px-3"
        @end="onDragEnd"
      >
        <TaskCard v-for="task in columns[status]" :key="task.id" :task="task" @open="openedTask = $event" />
      </VueDraggable>

      <div class="px-3">
        <form v-if="creatingIn === status" class="space-y-1.5" @submit.prevent="submitNewTask">
          <input
            v-model="newTitle"
            type="text"
            autofocus
            placeholder="Название задачи…"
            class="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink"
            @keyup.esc="creatingIn = null"
          />
          <div class="flex gap-1.5">
            <button type="submit" class="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700">Добавить</button>
            <button type="button" class="rounded-lg px-2.5 py-1 text-[11px] text-ink-soft hover:bg-card" @click="creatingIn = null">Отмена</button>
          </div>
        </form>
        <button
          v-else
          type="button"
          class="w-full rounded-xl border border-dashed border-line py-2 text-[11px] font-semibold text-ink-soft hover:bg-card"
          @click="creatingIn = status; newTitle = ''"
        >
          + Добавить
        </button>
      </div>
    </div>

    <TaskDrawer :task="openedTask" @close="openedTask = null" />
  </div>
</template>
