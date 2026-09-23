import { defineStore } from 'pinia'

export interface AdminUser {
  id: number
  name: string
  email: string
  roles: string[]
  current_team_id: number | null
  created_at: string
}

export const useAdminUsersStore = defineStore('adminUsers', {
  state: () => ({
    users: [] as AdminUser[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: AdminUser[] }>('/admin/users')
        this.users = res.data
      } finally {
        this.loading = false
      }
    },

    async create(attributes: { name: string; email: string; password: string; roles: string[] }): Promise<AdminUser> {
      const res = await apiFetch<{ data: AdminUser }>('/admin/users', { method: 'POST', body: attributes })
      this.users.unshift(res.data)
      return res.data
    },

    async update(id: number, attributes: { name: string; email: string; password?: string; roles: string[] }): Promise<AdminUser> {
      const res = await apiFetch<{ data: AdminUser }>(`/admin/users/${id}`, { method: 'PUT', body: attributes })
      const index = this.users.findIndex((u) => u.id === id)
      if (index !== -1) {
        this.users[index] = res.data
      }
      return res.data
    },

    async remove(id: number) {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' })
      this.users = this.users.filter((u) => u.id !== id)
    },
  },
})
