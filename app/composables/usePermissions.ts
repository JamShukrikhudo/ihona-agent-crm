import type { Permission } from '~/stores/auth'

/**
 * Thin wrapper over the auth store's own `can` getter — a separate
 * composable rather than calling useAuthStore().can directly everywhere,
 * so CanAccess.vue and the permission middleware share one name for
 * "check a permission" that doesn't leak the fact it's backed by Pinia.
 */
export function usePermissions() {
  const auth = useAuthStore()

  return {
    can: (permission: Permission): boolean => auth.can(permission),
  }
}
