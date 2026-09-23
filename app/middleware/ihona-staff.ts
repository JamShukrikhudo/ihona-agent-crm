/**
 * Gates a route to ihona-staff only — cross-tenant platform admin
 * (Teams/Users/Roles), not something any developer company's own
 * agent/manager/admin should reach even at their highest role.
 */
export default defineNuxtRouteMiddleware(() => {
  // See agent.ts's comment: the token only exists in localStorage, so SSR
  // (including a Playwright page.goto or a real user's refresh/direct
  // link) always looks logged-out here. Enforced client-side only.
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  if (!auth.hasRole('ihona-staff')) {
    return navigateTo('/403')
  }
})
