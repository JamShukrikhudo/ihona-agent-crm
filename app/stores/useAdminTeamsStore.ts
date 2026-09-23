import { defineStore } from 'pinia'

export interface AdminTeam {
  id: number
  name: string
  user_id: number
  owner_name: string | null
  personal_team: boolean
  created_at: string
}

export const useAdminTeamsStore = defineStore('adminTeams', {
  state: () => ({
    teams: [] as AdminTeam[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: AdminTeam[] }>('/admin/teams')
        this.teams = res.data
      } finally {
        this.loading = false
      }
    },

    async create(attributes: { name: string; user_id: number }): Promise<AdminTeam> {
      const res = await apiFetch<{ data: AdminTeam }>('/admin/teams', { method: 'POST', body: attributes })
      this.teams.unshift(res.data)
      return res.data
    },

    async update(id: number, attributes: { name: string; user_id: number }): Promise<AdminTeam> {
      const res = await apiFetch<{ data: AdminTeam }>(`/admin/teams/${id}`, { method: 'PUT', body: attributes })
      const index = this.teams.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.teams[index] = res.data
      }
      return res.data
    },

    async remove(id: number) {
      await apiFetch(`/admin/teams/${id}`, { method: 'DELETE' })
      this.teams = this.teams.filter((t) => t.id !== id)
    },
  },
})
