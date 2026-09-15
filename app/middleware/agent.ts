/**
 * Gates a route to any authenticated staff role, not literally the
 * "agent" role alone — every higher role (sales-manager, developer-admin)
 * can do everything an agent can, so this is the floor, not an exact match.
 */
export default defineNuxtRouteMiddleware(() => {
  // The token lives in localStorage, restored by a .client.ts plugin — SSR
  // has no access to it and Pinia's state starts empty on every server
  // render, so checking auth here during SSR always sees "logged out" and
  // bounces even a validly-authenticated agent on any direct navigation
  // (typed URL, refresh, a Playwright page.goto — anything that isn't a
  // client-side <NuxtLink> transition after the app already hydrated).
  // Found live: the race-condition test's page.goto() to the chessboard
  // kept landing back on /login despite a valid token in localStorage.
  // Enforcement happens client-side only; onMounted-driven data fetches
  // (fetchUnits, etc.) never run during SSR anyway, so nothing sensitive
  // actually renders server-side while this defers.
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  const allowed: import('~/stores/auth').CrmRole[] = ['agent', 'sales-manager', 'developer-admin']
  if (!allowed.some((role) => auth.hasRole(role))) {
    return navigateTo('/403')
  }
})
