export default defineNuxtPlugin(async () => {
  // Awaited (unlike the inherited version) so role middleware never runs
  // against a half-restored session — restore() now does a round trip to
  // /v1/auth/user, not just a synchronous localStorage read.
  const auth = useAuthStore()
  await auth.restore()
})
