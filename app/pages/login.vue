<script setup lang="ts">
definePageMeta({ layout: false })

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

// Chrome sets autofilled input values directly in the DOM without firing a
// native `input` event, so v-model never updates and Vuetify's floating
// label stays collapsed, overlapping the autofilled text. The CSS
// `autofill-detect` animation (assets/css/main.css) is what lets us detect
// it, but a listener bound through Vue (`@animationstart` in the template)
// only starts working once the JS bundle has loaded and hydrated — and
// real-world autofill (unlike our earlier synthetic CDP test) often fires
// before that point, so the event gets lost. server/plugins/
// login-autofill-script.ts injects a native listener straight into <head>
// as raw HTML, which runs before the Vuetify/Vue bundle even starts
// downloading, and stashes any autofilled value on `window.__autofill`.
// This just drains that stash once we're mounted, and keeps listening for
// later autofill (e.g. the user picking a suggestion after page load).
function syncAutofill() {
  const stash = (window as any).__autofill as Record<string, string> | undefined
  if (stash?.email) {
    email.value = stash.email
  }
  if (stash?.password) {
    password.value = stash.password
  }
}

onMounted(() => {
  syncAutofill()
  window.addEventListener('autofill-sync', syncAutofill)
})
onBeforeUnmount(() => {
  window.removeEventListener('autofill-sync', syncAutofill)
})

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
  <VApp>
  <div class="flex min-h-screen bg-card">
    <!-- Illustration side — hidden on narrow screens, same split-panel
         shape as the Spike Admin reference the user pointed at, themed to
         real estate (a building + key) instead of a generic phone/lock. -->
    <div class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-50 p-10 lg:flex">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-[15px] font-extrabold text-white">i</div>
        <span class="font-display text-lg font-extrabold text-ink">ihona CRM</span>
      </div>

      <svg viewBox="0 0 480 420" class="mx-auto w-full max-w-md" fill="none">
        <ellipse cx="240" cy="380" rx="170" ry="16" fill="currentColor" class="text-brand-100" />

        <!-- Building -->
        <rect x="130" y="90" width="160" height="270" rx="10" fill="currentColor" class="text-card" />
        <rect x="130" y="90" width="160" height="270" rx="10" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-200" />
        <g class="text-brand-200" stroke="currentColor" stroke-width="2">
          <rect x="152" y="118" width="28" height="28" rx="3" fill="none" />
          <rect x="196" y="118" width="28" height="28" rx="3" fill="none" />
          <rect x="240" y="118" width="28" height="28" rx="3" fill="none" />
          <rect x="152" y="162" width="28" height="28" rx="3" fill="none" />
          <rect x="196" y="162" width="28" height="28" rx="3" fill="none" />
          <rect x="240" y="162" width="28" height="28" rx="3" fill="none" />
          <rect x="152" y="206" width="28" height="28" rx="3" fill="none" />
          <rect x="196" y="206" width="28" height="28" rx="3" fill="none" />
          <rect x="240" y="206" width="28" height="28" rx="3" fill="none" />
          <rect x="152" y="250" width="28" height="28" rx="3" fill="none" />
          <rect x="240" y="250" width="28" height="28" rx="3" fill="none" />
        </g>
        <rect x="196" y="250" width="28" height="70" rx="3" fill="currentColor" class="text-brand-600" />
        <rect x="130" y="90" width="160" height="14" rx="7" fill="currentColor" class="text-brand-600" />

        <!-- Second, smaller building behind -->
        <rect x="290" y="150" width="90" height="210" rx="8" fill="currentColor" class="text-brand-100" />
        <g class="text-card" stroke="none">
          <rect x="306" y="172" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="340" y="172" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="306" y="206" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="340" y="206" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="306" y="240" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="340" y="240" width="20" height="20" rx="2" fill="currentColor" opacity="0.7" />
        </g>

        <!-- Key -->
        <g transform="translate(300,300) rotate(-28)">
          <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="7" class="text-brand-600" />
          <rect x="16" y="-4" width="46" height="8" rx="2" fill="currentColor" class="text-brand-600" />
          <rect x="48" y="4" width="8" height="14" fill="currentColor" class="text-brand-600" />
          <rect x="60" y="4" width="8" height="10" fill="currentColor" class="text-brand-600" />
        </g>

        <!-- Small tree -->
        <circle cx="90" cy="300" r="26" fill="currentColor" class="text-brand-200" />
        <rect x="86" y="320" width="8" height="40" fill="currentColor" class="text-brand-300" />
      </svg>

      <div>
        <div class="font-display text-xl font-bold text-ink">CRM для риелторов Таджикистана</div>
        <p class="mt-1 text-[13px] text-ink-soft">Воронка заявок, шахматка объектов, клиенты и показы — в одном кабинете.</p>
      </div>
    </div>

    <!-- Form side -->
    <div class="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2">
      <div class="mx-auto w-full max-w-sm">
        <h1 class="font-display text-2xl font-bold text-ink">Добро пожаловать</h1>
        <p class="mt-1 text-[13px] text-ink-soft">Кабинет агента ihona.tj</p>

        <form class="mt-8 space-y-5" @submit.prevent="submit">
          <VTextField v-model="email" type="email" label="Email" required autocomplete="username" />

          <VTextField v-model="password" type="password" label="Пароль" required autocomplete="current-password" />

          <VAlert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</VAlert>

          <VBtn type="submit" color="primary" :loading="loading" block size="large" rounded="pill">
            Войти
          </VBtn>
        </form>
      </div>
    </div>
  </div>
  </VApp>
</template>
