/**
 * Gates a route to sales-manager or developer-admin — e.g. the CRM funnel
 * board (Sprint 4-5), which a plain agent can view unit-level data for but
 * shouldn't manage.
 */
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  const allowed: import('~/stores/auth').CrmRole[] = ['sales-manager', 'developer-admin']
  if (!allowed.some((role) => auth.hasRole(role))) {
    return navigateTo('/403')
  }
})
