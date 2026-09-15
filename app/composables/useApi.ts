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
    if ((error as { response?: { status?: number } })?.response?.status === 401) {
      handleUnauthorized()
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
    navigateTo('/login')
  }
}
