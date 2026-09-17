import { defineStore } from 'pinia'

export interface Installment {
  id: number
  position: number
  dueAt: string
  amount: number
  paidAt: string | null
  overdue: boolean
}

export interface Contract {
  id: number
  status: 'active' | 'cancelled'
  amount: number
  currency: string
  signedAt: string
  outstandingBalance: number
  unitId: number
  unitLabel: string | null
  clientId: number | null
  clientName: string | null
  installments?: Installment[]
}

export const useContractsStore = defineStore('contracts', {
  state: () => ({
    contracts: [] as Contract[],
    loading: false,
  }),

  getters: {
    overdueCount: (state) => state.contracts.filter((c) => c.installments?.some((i) => i.overdue)).length,
  },

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const res = await apiFetch<{ data: Contract[] }>('/contracts')
        this.contracts = res.data
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id: number): Promise<Contract> {
      const res = await apiFetch<{ data: Contract }>(`/contracts/${id}`)
      return res.data
    },

    async createForUnit(unitId: number, attributes: { amount: number; currency?: string; installments_count?: number; first_installment_due_at?: string }): Promise<Contract> {
      const res = await apiFetch<{ data: Contract }>(`/units/${unitId}/contract`, {
        method: 'POST',
        body: attributes,
      })
      this.contracts.unshift(res.data)
      return res.data
    },

    async payInstallment(installmentId: number): Promise<Installment> {
      const res = await apiFetch<{ data: Installment }>(`/installments/${installmentId}/pay`, { method: 'POST' })
      return res.data
    },
  },
})
