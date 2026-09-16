import type { UseFetchOptions } from 'nuxt/app'

/**
 * Overrides the extended layer's useApi/apiFetch: same Bearer-token
 * mechanics, but a 401 here means the agent's session actually expired
 * (unlike the storefront, where most pages work signed-out) — every
 * authenticated screen in this cabinet depends on it, so a stale token
 * gets dropped and the agent sent back to /login instead of the page
 * silently rendering with no data.
 */
export function useApi<T>(path: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  return useFetch(path, {
    baseURL: config.public.apiBase,
    ...options,
    headers: {
      Accept: 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        handleUnauthorized()
      } else if (response.status === 403) {
        handleForbidden()
      }
    },
  })
}

export async function apiFetch<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  try {
    return await $fetch<T>(path, {
      baseURL: config.public.apiBase,
      ...options,
      headers: {
        Accept: 'application/json',
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    })
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      handleUnauthorized()
    } else if (status === 403) {
      handleForbidden()
    }
    throw error
  }
}

function handleUnauthorized() {
  const auth = useAuthStore()
  auth.token = null
  auth.user = null
  if (import.meta.client) {
    localStorage.removeItem('ihona_token')
    resetCrmStores()
    navigateTo('/login')
  }
}

/**
 * A 403 is expected behavior (a role that genuinely can't do this), not a
 * bug — it gets the same "нет доступа" page the role middleware already
 * shows for a disallowed route (app/pages/403.vue), not the generic
 * error overlay a thrown-and-uncaught fetch error would otherwise produce.
 * Still re-thrown by both callers above so a caller doing its own
 * optimistic-update rollback (see useUnitsStore) still sees the failure.
 */
function handleForbidden() {
  if (import.meta.client) {
    navigateTo('/403')
  }
}
