import { defineStore } from 'pinia'

export type LeadStage = 'new' | 'contacted' | 'viewing_scheduled' | 'reserved' | 'contracted' | 'lost'

export const LEAD_STAGES: LeadStage[] = ['new', 'contacted', 'viewing_scheduled', 'reserved', 'contracted', 'lost']

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: 'Лиды',
  contacted: 'Контакт',
  viewing_scheduled: 'Показ',
  reserved: 'Бронь',
  contracted: 'Договор',
  lost: 'Отказ',
}

/**
 * A thin colored bar along the top of each Kanban column so the funnel's
 * shape reads at a glance without opening a single card — borrowed from
 * the ShamCRM reference audit (docs), not its dark theme, just the pattern
 * of color carrying status instead of decorating it.
 */
export const LEAD_STAGE_ACCENT: Record<LeadStage, string> = {
  new: 'bg-slate-300',
  contacted: 'bg-sky-400',
  viewing_scheduled: 'bg-amber-400',
  reserved: 'bg-violet-400',
  contracted: 'bg-brand-500',
  lost: 'bg-red-400',
}

export interface LeadNextTask {
  title: string
  dueAt: string | null
  overdue: boolean
}

export interface Lead {
  id: number
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  stage: LeadStage
  lostReason: string | null
  clientId: number | null
  unitId: number | null
  unitLabel: string | null
  unitPrice: number | null
  buildingName: string | null
  agent: string | null
  source: string | null
  nextTask: LeadNextTask | null
  notes: string | null
  createdAt: string
  openTasksCount: number
}

export interface LeadTask {
  id: number
  title: string
  assignee: string | null
  dueAt: string | null
  doneAt: string | null
}

/**
 * Mirrors useUnitsStore's shape: one shared list the Kanban board reads,
 * Echo's LeadStageChanged handler and drag-driven transitions both write
 * back into via patchLead, so every open board tab sees the same state.
 */
export const useLeadsStore = defineStore('leads', {
  state: () => ({
    leads: [] as Lead[],
    loading: false,
  }),

  getters: {
    byId: (state) => (id: number) => state.leads.find((lead) => lead.id === id) ?? null,
    byStage: (state) => {
      const columns = new Map<LeadStage, Lead[]>()
      for (const stage of LEAD_STAGES) {
        columns.set(stage, [])
      }
      for (const lead of state.leads) {
        columns.get(lead.stage)?.push(lead)
      }
      return columns
    },
  },

  actions: {
    async fetchLeads() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: Lead[] }>('/leads')
        this.leads = res.data
      } finally {
        this.loading = false
      }
    },

    patchLead(id: number, patch: Partial<Lead>) {
      const lead = this.leads.find((l) => l.id === id)
      if (lead) {
        Object.assign(lead, patch)
      }
    },

    async createLead(attributes: { client_id?: number; contact_name?: string; contact_phone?: string; contact_email?: string; source?: string }) {
      const res = await apiFetch<{ data: Lead }>('/leads', { method: 'POST', body: attributes })
      this.leads.unshift(res.data)
      return res.data
    },

    /**
     * The board's drag-to-column action. A card dropped on "Бронь" that
     * already has a unit attached reuses the exact /units/{id}/reserve
     * endpoint Sprint 2 built — not a second reservation mechanism — so
     * the chessboard and the funnel never disagree about a unit's status.
     * If the reserve call 409s (someone else already holds the unit), the
     * lead's stage is rolled back to where it was and the toast carries
     * the server's real message, same pattern as optimisticUpdate.
     */
    async transitionLead(id: number, stage: LeadStage, options: { lostReason?: string } = {}): Promise<boolean> {
      const lead = this.leads.find((l) => l.id === id)
      if (!lead) {
        return false
      }

      const before = lead.stage
      this.patchLead(id, { stage })

      try {
        if (stage === 'reserved' && lead.unitId) {
          if (!lead.clientId) {
            throw { data: { message: 'У сделки нет привязанного клиента — сначала откройте карточку и укажите клиента.' } }
          }
          await apiFetch(`/units/${lead.unitId}/reserve`, { method: 'POST', body: { client_id: lead.clientId } })
        }
        await apiFetch(`/leads/${id}/transition`, {
          method: 'POST',
          body: { stage, lost_reason: options.lostReason },
        })
        return true
      } catch (error) {
        this.patchLead(id, { stage: before })
        const message = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось перевести сделку на этот этап.'
        useToastStore().push(message, 'error')
        return false
      }
    },

    async addTask(leadId: number, title: string, dueAt: string | null) {
      await apiFetch(`/leads/${leadId}/tasks`, {
        method: 'POST',
        body: { title, due_at: dueAt },
      })
      this.patchLead(leadId, { openTasksCount: (this.byId(leadId)?.openTasksCount ?? 0) + 1 })
    },

    async completeTask(leadId: number, taskId: number) {
      await apiFetch(`/lead-tasks/${taskId}/complete`, { method: 'POST' })
      const lead = this.byId(leadId)
      if (lead) {
        this.patchLead(leadId, { openTasksCount: Math.max(0, lead.openTasksCount - 1) })
      }
    },
  },
})
