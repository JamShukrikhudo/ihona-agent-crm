/**
 * Called from both auth.logout() and useApi's 401 handler — a stale
 * Pinia store surviving past a logout/session-expiry is a real data leak,
 * not a hypothetical one: two different companies' agents sharing one
 * device (a shop floor tablet, a shared kiosk) would otherwise see the
 * previous company's units/leads/clients flash on screen before the new
 * fetch resolves, or worse, act on data that isn't theirs.
 */
export function resetCrmStores(): void {
  useUnitsStore().$reset()
  useLeadsStore().$reset()
  useClientsStore().$reset()
  useInboxStore().$reset()
  // Admin stores hold every developer company's teams/users, not just one
  // — an even bigger leak risk than the per-team stores above if a
  // shared device logs out of one ihona-staff session into anything else.
  useAdminTeamsStore().$reset()
  useAdminUsersStore().$reset()
  useAdminRolesStore().$reset()
}
