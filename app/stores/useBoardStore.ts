import { defineStore } from 'pinia'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Готово',
}

export const TASK_STATUS_ACCENT: Record<TaskStatus, string> = {
  todo: 'bg-slate-300',
  in_progress: 'bg-amber-400',
  done: 'bg-brand-500',
}

export interface BoardTask {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  position: number
  assigneeId: number | null
  assigneeName: string | null
  createdByName: string | null
  dueAt: string | null
  createdAt: string
}

/**
 * A standalone Trello-style board — not a view over Leads, a completely
 * separate resource (see BoardTaskController) for internal work items
 * that don't belong to any deal.
 */
export const useBoardStore = defineStore('board', {
  state: () => ({
    tasks: [] as BoardTask[],
    loading: false,
  }),
  getters: {
    byStatus: (state) => (status: TaskStatus) =>
      state.tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position),
  },
  actions: {
    async fetchTasks() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: BoardTask[] }>('/board-tasks')
        this.tasks = res.data
      } finally {
        this.loading = false
      }
    },
    async createTask(payload: { title: string; description?: string; status?: TaskStatus; assignee_id?: number; due_at?: string }) {
      const res = await apiFetch<{ data: BoardTask }>('/board-tasks', { method: 'POST', body: payload })
      this.tasks.push(res.data)
      return res.data
    },
    async updateTask(id: number, patch: { title?: string; description?: string | null; assignee_id?: number | null; due_at?: string | null }) {
      const res = await apiFetch<{ data: BoardTask }>(`/board-tasks/${id}`, { method: 'PATCH', body: patch })
      const index = this.tasks.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.tasks[index] = res.data
      }
    },
    async deleteTask(id: number) {
      await apiFetch(`/board-tasks/${id}`, { method: 'DELETE' })
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },
    /** One call per column a drag actually changed — see TaskBoard.vue's
     * onDragEnd. Optimistic: the local `tasks` array already reflects the
     * drop (that's what VueDraggable mutated), this just persists it. */
    async reorder(status: TaskStatus, taskIds: number[]) {
      await apiFetch('/board-tasks/reorder', { method: 'PATCH', body: { status, task_ids: taskIds } })
      taskIds.forEach((id, index) => {
        const task = this.tasks.find((t) => t.id === id)
        if (task) {
          task.status = status
          task.position = index
        }
      })
    },
    $reset() {
      this.tasks = []
      this.loading = false
    },
  },
})
