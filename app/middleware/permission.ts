import type { Permission } from '~/stores/auth'

/**
 * Applied via definePageMeta({ permission: 'imports.units' }) — a single
 * generic middleware instead of one hand-written file per permission,
 * unlike agent.ts/sales-manager.ts/developer-admin.ts which each hardcode
 * their own role list. Those three stay as-is (role, not permission,
 * checks) since nothing here has migrated off them yet; new pages that
 * gate on a specific action should use this one instead of adding a
 * fourth role-named middleware file.
 */
export default defineNuxtRouteMiddleware((to) => {
  // See agent.ts's comment: the token only exists in localStorage, so SSR
  // always looks logged-out here. Enforced client-side only.
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  const permission = to.meta.permission as Permission | undefined
  if (permission && !auth.can(permission)) {
    return navigateTo('/403')
  }
})
