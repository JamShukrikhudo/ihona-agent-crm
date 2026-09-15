/**
 * Gates a route to sales-manager or developer-admin — e.g. the CRM funnel
 * board (Sprint 4-5), which a plain agent can view unit-level data for but
 * shouldn't manage.
 */
export default defineNuxtRouteMiddleware(() => {
  // See agent.ts's comment: the token only exists in localStorage, so SSR
  // (including a Playwright page.goto or a real agent's refresh/direct
  // link) always looks logged-out here. Enforced client-side only.
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  const allowed: import('~/stores/auth').CrmRole[] = ['sales-manager', 'developer-admin']
  if (!allowed.some((role) => auth.hasRole(role))) {
    return navigateTo('/403')
  }
})
