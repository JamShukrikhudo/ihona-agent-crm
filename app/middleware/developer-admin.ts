/**
 * Gates a route to developer-admin only — the top role, for things like the
 * multi-project switcher (Sprint 7) and dashboard configuration (Sprint 6)
 * that a sales-manager shouldn't reach.
 */
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  if (!auth.hasRole('developer-admin')) {
    return navigateTo('/403')
  }
})
