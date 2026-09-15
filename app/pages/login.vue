<script setup lang="ts">
import { Building2 } from '@lucide/vue'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await navigateTo('/')
  } catch {
    error.value = 'Неверный email или пароль.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-paper">
    <form class="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-card p-8 shadow-sm" @submit.prevent="submit">
      <div class="flex items-center gap-2 text-brand-dark">
        <Building2 :size="20" />
        <h1 class="font-display text-lg font-bold text-ink">Ihona · Кабинет агента</h1>
      </div>

      <div class="space-y-1">
        <label class="text-[12px] font-medium text-ink-soft" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="username"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
      </div>

      <div class="space-y-1">
        <label class="text-[12px] font-medium text-ink-soft" for="password">Пароль</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
        />
      </div>

      <p v-if="error" class="rounded-lg bg-status-sold-soft px-3 py-2 text-[13px] text-status-sold">{{ error }}</p>

      <button type="submit" :disabled="loading" class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
        {{ loading ? 'Входим…' : 'Войти' }}
      </button>
    </form>
  </div>
</template>
