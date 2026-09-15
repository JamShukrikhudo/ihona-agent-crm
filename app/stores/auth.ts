import { defineStore } from 'pinia'

export type CrmRole = 'agent' | 'sales-manager' | 'developer-admin'

interface User {
  id: number
  name: string
  email: string
  roles: string[]
  teamId: number | string | null
}

/**
 * Overrides the extended ihona-frontend layer's stores/auth.ts — same
 * Sanctum token endpoint (/v1/auth/token, identity-core-api), same
 * localStorage key, but with `roles` on the user so the role middleware
 * (agent.ts/sales-manager.ts/developer-admin.ts) has something to check.
 * The storefront's own auth store never needed roles; the agent cabinet
 * does, so this can't just inherit the parent file unchanged.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as User | null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    hasRole: (state) => (role: CrmRole) => state.user?.roles.includes(role) ?? false,
  },

  actions: {
    async login(email: string, password: string) {
      const res = await apiFetch<{ plainTextToken: string; user: User }>('/v1/auth/token', {
        method: 'POST',
        body: { email, password },
      })
      this.setSession(res.plainTextToken, res.user)
    },

    setSession(token: string, user: User) {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('ihona_token', token)
      }
    },

    async logout() {
      if (this.token) {
        await apiFetch('/v1/auth/token', { method: 'DELETE' }).catch(() => null)
      }
      this.token = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('ihona_token')
      }
    },

    async restore() {
      if (!import.meta.client) {
        return
      }
      this.token = localStorage.getItem('ihona_token')
      if (!this.token) {
        return
      }
      try {
        const res = await apiFetch<{ user: User }>('/v1/auth/user')
        this.user = res.user
      } catch {
        // Stored token is gone/expired server-side — drop it so
        // isAuthenticated/hasRole reflect reality instead of a stale token.
        this.token = null
        this.user = null
        localStorage.removeItem('ihona_token')
      }
    },
  },
})
