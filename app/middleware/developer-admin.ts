/**
 * Gates a route to developer-admin only — the top role, for things like the
 * multi-project switcher (Sprint 7) and dashboard configuration (Sprint 6)
 * that a sales-manager shouldn't reach.
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

  if (!auth.hasRole('developer-admin')) {
    return navigateTo('/403')
  }
})
