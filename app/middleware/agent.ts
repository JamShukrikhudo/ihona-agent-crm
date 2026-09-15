/**
 * Gates a route to any authenticated staff role, not literally the
 * "agent" role alone — every higher role (sales-manager, developer-admin)
 * can do everything an agent can, so this is the floor, not an exact match.
 */
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  const allowed: import('~/stores/auth').CrmRole[] = ['agent', 'sales-manager', 'developer-admin']
  if (!allowed.some((role) => auth.hasRole(role))) {
    return navigateTo('/403')
  }
})
