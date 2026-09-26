import { defineStore } from 'pinia'
import type { Lead } from '~/stores/useLeadsStore'

export interface Client {
  id: number
  name: string
  phone: string
  email: string | null
  notes: string | null
  region: string | null
  assignedAgentId: number | null
  assignedAgentName: string | null
  source: string | null
  channels: string[] | null
  createdAt: string
}

export interface TeamAgent {
  id: number
  name: string
}

export interface ClientInteraction {
  id: number
  type: 'note' | 'call' | 'whatsapp' | 'instagram' | 'telegram' | 'reserved' | 'released' | 'deposit' | 'sold'
  message: string | null
  // null for every type except a real two-way channel message (telegram
  // today) — a manually-typed note has no "direction", it's just a log.
  direction: 'inbound' | 'outbound' | null
  unitLabel: string | null
  createdBy: string | null
  createdAt: string
}

export const useClientsStore = defineStore('clients', {
  actions: {
    /** ClientPicker's debounced search — by phone or name, whichever the
     * agent typed. Doesn't touch state; the picker owns its own result list
     * locally rather than everyone sharing one global "search results". */
    async search(query: string): Promise<Client[]> {
      if (query.trim() === '') {
        return []
      }
      const isPhoneLike = /\d/.test(query)
      const params = isPhoneLike ? { phone: query } : { q: query }
      const res = await apiFetch<{ data: Client[] }>('/clients', { params })
      return res.data
    },

    /** Resolves a client_id for the reserve flow: existing client if the
     * phone matches, a new row otherwise. Never a silent duplicate — the
     * backend enforces uniqueness on (team, phone) too. */
    async findOrCreateByPhone(phone: string, name?: string): Promise<Client> {
      const res = await apiFetch<{ data: Client }>('/clients', {
        method: 'POST',
        body: { phone, name },
      })
      return res.data
    },

    async fetchHistory(clientId: number): Promise<{ client: Client; units: unknown[]; leads: Lead[]; interactions: ClientInteraction[]; channels: string[] }> {
      const res = await apiFetch<{ data: Client; units: unknown[]; leads: Lead[]; interactions: ClientInteraction[]; channels: string[] }>(`/clients/${clientId}`)
      return { client: res.data, units: res.units, leads: res.leads, interactions: res.interactions, channels: res.channels }
    },

    async addInteraction(clientId: number, type: 'note' | 'call' | 'whatsapp' | 'instagram' | 'telegram', message: string, unitId?: number) {
      await apiFetch(`/clients/${clientId}/interactions`, {
        method: 'POST',
        body: { type, message, unit_id: unitId },
      })
    },

    /** A real reply sent through the client's linked Telegram bot, not a
     * logged note — see ClientController::sendTelegramMessage. */
    async sendTelegramMessage(clientId: number, message: string): Promise<ClientInteraction> {
      const res = await apiFetch<{ data: ClientInteraction }>(`/clients/${clientId}/telegram-messages`, {
        method: 'POST',
        body: { message },
      })
      return res.data
    },

    async updateClient(clientId: number, patch: { name?: string; phone?: string; email?: string | null; notes?: string | null; region?: string | null; assigned_agent_id?: number | null }): Promise<Client> {
      const res = await apiFetch<{ data: Client }>(`/clients/${clientId}`, {
        method: 'PUT',
        body: patch,
      })
      return res.data
    },

    /** Roster for the Менеджер dropdown — the current agent's own team,
     * id+name only (see TeamAgentController, open to any authenticated
     * team member, unlike the admin-only /admin/users list). */
    async fetchTeamAgents(): Promise<TeamAgent[]> {
      const res = await apiFetch<{ data: TeamAgent[] }>('/team/agents')
      return res.data
    },

    async deleteClient(clientId: number) {
      await apiFetch(`/clients/${clientId}`, { method: 'DELETE' })
    },
  },
})
