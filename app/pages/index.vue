<script setup lang="ts">
definePageMeta({ middleware: 'agent' })

const auth = useAuthStore()
const echoState = ref('connecting…')

onMounted(() => {
  const echo = useEcho()
  const pusher = echo.connector.pusher

  pusher.connection.bind('state_change', (states: { current: string }) => {
    echoState.value = states.current
  })
  echoState.value = pusher.connection.state
})

onBeforeUnmount(() => disconnectEcho())
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
    <div class="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 class="font-display text-2xl font-semibold text-brand-800">Кабинет агента</h1>
      <p class="text-slate-700 dark:text-slate-300">Здравствуйте, {{ auth.user?.name }} ({{ auth.user?.roles.join(', ') }})</p>

      <div class="flex items-center gap-2">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="echoState === 'connected' ? 'bg-status-free' : 'bg-status-reserved'"
        />
        <span class="text-sm text-slate-600 dark:text-slate-400">Echo/Reverb: {{ echoState }}</span>
      </div>

      <p class="text-sm text-slate-500">
        Шахматка появится в Спринте 1. Это Спринт 0 — фундамент: логин работает,
        сокет подключается.
      </p>

      <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="auth.logout().then(() => navigateTo('/login'))">
        Выйти
      </button>
    </div>
  </div>
</template>
