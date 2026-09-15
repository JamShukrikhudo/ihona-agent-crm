import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echo: Echo<'reverb'> | null = null

/**
 * One shared Echo/Reverb connection per browser tab, lazily created on
 * first use and reused after — every ShahmatkaGrid instance subscribing
 * to its own project.{id} channel shouldn't each open a new socket.
 * wsPath is '/reverb', not the Reverb/Echo default of '/app': the main
 * ihona backend already has a Filament panel mounted at /app, and
 * REVERB_SERVER_PATH doesn't reliably change what the Reverb server
 * itself expects (laravel/reverb#361) — nginx rewrites /reverb/app/{key}
 * back to /app/{key} for the Reverb process, so the client and server
 * agree without patching Reverb itself.
 */
export function useEcho(): Echo<'reverb'> {
  if (echo) {
    return echo
  }

  const config = useRuntimeConfig()
  const auth = useAuthStore()

  // laravel-echo's reverb broadcaster expects a global Pusher constructor,
  // not an import it resolves itself.
  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  echo = new Echo({
    broadcaster: 'reverb',
    key: config.public.reverbAppKey,
    wsHost: config.public.reverbHost,
    wsPort: config.public.reverbPort,
    wssPort: config.public.reverbPort,
    wsPath: '/reverb',
    forceTLS: config.public.reverbScheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${config.public.apiBase}/broadcasting/auth`,
    auth: {
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    },
  })

  return echo
}

/**
 * Sprint 1 wires the actual project.{id}/UnitStatusChanged subscription;
 * Sprint 0 only needs the socket to reach OPEN — this disconnects the
 * shared instance cleanly (e.g. on logout) without leaking a listener.
 */
export function disconnectEcho(): void {
  echo?.disconnect()
  echo = null
}
