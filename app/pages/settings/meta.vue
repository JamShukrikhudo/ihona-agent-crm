<script setup lang="ts">
import { Camera, MessageCircle, Unlink } from '@lucide/vue'

// Connects the team's own WhatsApp number + Instagram account under the
// platform's single Meta app (see MetaWebhookController's own comment —
// one callback URL, configured once in the App Dashboard, not per team).
// A team can set WhatsApp, Instagram, or both.
definePageMeta({ middleware: 'sales-manager' })

const connected = ref(false)
const phoneNumberId = ref('')
const instagramId = ref('')
const accessTokenInput = ref('')
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await apiFetch<{ data: { connected: boolean; phoneNumberId: string | null; instagramBusinessAccountId: string | null } }>('/meta-setting')
    connected.value = res.data.connected
    phoneNumberId.value = res.data.phoneNumberId ?? ''
    instagramId.value = res.data.instagramBusinessAccountId ?? ''
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function save() {
  if (!connected.value && accessTokenInput.value.trim() === '') {
    useToastStore().push('Укажите access token', 'error')
    return
  }
  saving.value = true
  try {
    await apiFetch('/meta-setting', {
      method: 'POST',
      body: {
        access_token: accessTokenInput.value.trim() || undefined,
        phone_number_id: phoneNumberId.value.trim() || undefined,
        instagram_business_account_id: instagramId.value.trim() || undefined,
      },
    })
    accessTokenInput.value = ''
    connected.value = true
    useToastStore().push('Meta подключена', 'success')
  } catch {
    useToastStore().push('Не удалось сохранить — проверьте токен', 'error')
  } finally {
    saving.value = false
  }
}

async function disconnect() {
  saving.value = true
  try {
    await apiFetch('/meta-setting', { method: 'DELETE' })
    connected.value = false
    phoneNumberId.value = ''
    instagramId.value = ''
    useToastStore().push('Отключено', 'success')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Настройки</div>
      <h1 class="font-display text-xl font-bold text-ink">WhatsApp / Instagram (Meta)</h1>
    </div>

    <div class="mx-auto max-w-lg space-y-4 px-6 py-8">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl border border-line bg-card" />

      <template v-else>
        <div class="rounded-2xl border border-line bg-card p-5">
          <div class="mb-2 flex items-center gap-2">
            <MessageCircle :size="16" class="text-brand-600" />
            <Camera :size="16" class="text-brand-600" />
            <span class="font-display text-sm font-bold text-ink">Meta для команды</span>
          </div>
          <p class="mb-4 text-[13px] text-ink-soft">
            Один и тот же access token из вашего Meta-приложения (System User token с правами на WhatsApp Cloud API и/или Instagram Messaging).
            Phone Number ID и Instagram Business Account ID берутся там же, в API Setup вашего приложения на
            <span class="font-medium text-ink">developers.facebook.com</span>.
          </p>

          <div v-if="connected" class="mb-4 flex items-center justify-between rounded-xl bg-status-free-soft px-3.5 py-2.5">
            <span class="text-[13px] font-semibold text-brand-dark">Подключено</span>
            <button
              type="button"
              :disabled="saving"
              class="flex items-center gap-1 text-[12px] font-semibold text-status-deposit hover:underline disabled:opacity-60"
              @click="disconnect"
            >
              <Unlink :size="12" /> Отключить
            </button>
          </div>

          <!-- type="password" here was tricking Chrome's credential
               autofill into treating this as a real login form — it would
               fill this field with a saved password AND silently pollute
               the next text input (Phone Number ID/Instagram id) with a
               saved username/email. autocomplete="new-password" plus a
               name unrelated to "token"/"password" stops Chrome from
               pattern-matching it as a login field. -->
          <label class="mb-1 block text-[12px] text-ink-soft">Access Token</label>
          <input
            v-model="accessTokenInput"
            type="password"
            name="meta-credential"
            autocomplete="new-password"
            data-lpignore="true"
            data-1p-ignore
            :placeholder="connected ? 'Оставьте пустым, чтобы не менять' : 'EAAG...'"
            class="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />

          <label class="mb-1 block text-[12px] text-ink-soft">Phone Number ID (WhatsApp)</label>
          <input
            v-model="phoneNumberId"
            type="text"
            autocomplete="off"
            data-lpignore="true"
            data-1p-ignore
            placeholder="Необязательно, если WhatsApp не используется"
            class="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />

          <label class="mb-1 block text-[12px] text-ink-soft">Instagram Business Account ID</label>
          <input
            v-model="instagramId"
            type="text"
            autocomplete="off"
            data-lpignore="true"
            data-1p-ignore
            placeholder="Необязательно, если Instagram не используется"
            class="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          />

          <button
            type="button"
            :disabled="saving"
            class="w-full rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            @click="save"
          >
            {{ connected ? 'Сохранить изменения' : 'Подключить' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
