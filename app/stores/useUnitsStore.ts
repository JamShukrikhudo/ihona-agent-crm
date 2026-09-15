import { defineStore } from 'pinia'

export type UnitStatus = 'free' | 'reserved' | 'deposit' | 'sold'

export interface Unit {
  id: number
  section: string
  floor: number
  rooms: number
  area: number
  price: number
  status: UnitStatus
  agent: string | null
  expiresInHours: number | null
}

/**
 * Single source of truth for a project's units — ShahmatkaGrid reads from
 * here, Echo's UnitStatusChanged handler (Sprint 1) and the reserve/release
 * actions (Sprint 2) both write here via patchUnit, so every consumer sees
 * the same state without re-fetching the whole grid on every change.
 */
export const useUnitsStore = defineStore('units', {
  state: () => ({
    projectId: null as number | null,
    units: [] as Unit[],
    loading: false,
  }),

  getters: {
    byId: (state) => (id: number) => state.units.find((unit) => unit.id === id) ?? null,
    byFloor: (state) => {
      const floors = new Map<number, Unit[]>()
      for (const unit of state.units) {
        const list = floors.get(unit.floor) ?? []
        list.push(unit)
        floors.set(unit.floor, list)
      }
      return floors
    },
  },

  actions: {
    async fetchUnits(projectId: number) {
      this.loading = true
      this.projectId = projectId
      try {
        const res = await apiFetch<{ data: Unit[] }>(`/projects/${projectId}/units`)
        this.units = res.data
      } finally {
        this.loading = false
      }
    },

    patchUnit(id: number, patch: Partial<Unit>) {
      const unit = this.units.find((u) => u.id === id)
      if (unit) {
        Object.assign(unit, patch)
      }
    },

    /**
     * Applies `patch` immediately (a reservation click should repaint the
     * cell before the network round-trip finishes, not after), then runs
     * `apiCall`. On failure — a 409 from the exact race Sprint 2 exists to
     * catch, most often — the optimistic patch is rolled back to what the
     * unit actually looked like before, and the server's message (already
     * written in the "Не удалось: юнит X уже забронировал агент Y" shape)
     * surfaces via the toast store. Reused by the CRM funnel's drag-to-
     * reserve in Sprint 4 as well, not just this panel's buttons.
     */
    async optimisticUpdate(id: number, patch: Partial<Unit>, apiCall: () => Promise<unknown>) {
      const unit = this.units.find((u) => u.id === id)
      if (!unit) {
        return
      }

      const before = { ...unit }
      this.patchUnit(id, patch)

      try {
        await apiCall()
      } catch (error) {
        this.patchUnit(id, before)
        const message = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось выполнить действие.'
        useToastStore().push(message, 'error')
      }
    },
  },
})
