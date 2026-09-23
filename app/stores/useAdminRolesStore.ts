import { defineStore } from 'pinia'

export interface AdminRole {
  id: number
  name: string
  permissions: string[]
}

export const useAdminRolesStore = defineStore('adminRoles', {
  state: () => ({
    roles: [] as AdminRole[],
    availablePermissions: [] as string[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const [rolesRes, permsRes] = await Promise.all([
          apiFetch<{ data: AdminRole[] }>('/admin/roles'),
          apiFetch<{ data: string[] }>('/admin/permissions'),
        ])
        this.roles = rolesRes.data
        this.availablePermissions = permsRes.data
      } finally {
        this.loading = false
      }
    },

    async create(attributes: { name: string; permissions: string[] }): Promise<AdminRole> {
      const res = await apiFetch<{ data: AdminRole }>('/admin/roles', { method: 'POST', body: attributes })
      this.roles.unshift(res.data)
      return res.data
    },

    async update(id: number, attributes: { name: string; permissions: string[] }): Promise<AdminRole> {
      const res = await apiFetch<{ data: AdminRole }>(`/admin/roles/${id}`, { method: 'PUT', body: attributes })
      const index = this.roles.findIndex((r) => r.id === id)
      if (index !== -1) {
        this.roles[index] = res.data
      }
      return res.data
    },

    async remove(id: number) {
      await apiFetch(`/admin/roles/${id}`, { method: 'DELETE' })
      this.roles = this.roles.filter((r) => r.id !== id)
    },
  },
})
