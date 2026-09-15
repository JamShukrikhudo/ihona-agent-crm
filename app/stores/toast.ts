import { defineStore } from 'pinia'

export interface Toast {
  id: number
  message: string
  kind: 'error' | 'success'
}

let nextId = 1

export const useToastStore = defineStore('toast', {
  state: () => ({ toasts: [] as Toast[] }),

  actions: {
    push(message: string, kind: Toast['kind'] = 'error') {
      const id = nextId++
      this.toasts.push({ id, message, kind })
      setTimeout(() => this.dismiss(id), 5000)
    },

    dismiss(id: number) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  },
})
