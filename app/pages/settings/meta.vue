<script setup lang="ts">
import { Camera, MessageCircle, MessageSquare } from '@lucide/vue'

// Connects the team's own WhatsApp number + Instagram account + Facebook
// page under the platform's single Meta app (see MetaWebhookController's
// own comment — one callback URL, configured once in the App Dashboard,
// not per team). A team can set any subset of the three.
definePageMeta({ middleware: 'sales-manager' })

const connected = ref(false)
const phoneNumberId = ref('')
const instagramId = ref('')
const pageId = ref('')
const accessTokenInput = ref('')
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await apiFetch<{ data: { connected: boolean; phoneNumberId: string | null; instagramBusinessAccountId: string | null; pageId: string | null } }>('/meta-setting')
    connected.value = res.data.connected
    phoneNumberId.value = res.data.phoneNumberId ?? ''
    instagramId.value = res.data.instagramBusinessAccountId ?? ''
    pageId.value = res.data.pageId ?? ''
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
        page_id: pageId.value.trim() || undefined,
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
    pageId.value = ''
    useToastStore().push('Отключено', 'success')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Настройки</div>
      <h1 class="font-display text-xl font-bold">WhatsApp / Instagram / Messenger (Meta)</h1>
    </div>

    <div class="mx-auto max-w-lg space-y-4 px-6 py-8">
      <VSkeleton v-if="loading" type="card" height="192" />

      <template v-else>
        <VCard>
          <VCardText>
            <div class="mb-2 flex items-center gap-2">
              <MessageCircle :size="16" class="text-primary" />
              <Camera :size="16" class="text-primary" />
              <MessageSquare :size="16" class="text-primary" />
              <span class="font-display text-sm font-bold">Meta для команды</span>
            </div>
            <p class="mb-4 text-[13px] text-medium-emphasis">
              Один и тот же access token из вашего Meta-приложения (System User token с правами на WhatsApp Cloud API, Instagram Messaging и/или Messenger).
              Phone Number ID, Instagram Business Account ID и Page ID берутся там же, в API Setup вашего приложения на
              <span class="font-medium">developers.facebook.com</span>.
            </p>

            <VAlert v-if="connected" type="success" variant="tonal" class="mb-4">
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-semibold">Подключено</span>
                <VBtn icon="mdi-link-off" color="error" variant="text" size="small" :loading="saving" @click="disconnect" />
              </div>
            </VAlert>

            <!-- type="password" here was tricking Chrome's credential
                 autofill into treating this as a real login form — it would
                 fill this field with a saved password AND silently pollute
                 the next text input (Phone Number ID/Instagram id) with a
                 saved username/email. autocomplete="new-password" plus a
                 name unrelated to "token"/"password" stops Chrome from
                 pattern-matching it as a login field. -->
            <VTextField
              v-model="accessTokenInput"
              type="password"
              name="meta-credential"
              autocomplete="new-password"
              data-lpignore="true"
              data-1p-ignore
              label="Access Token"
              :placeholder="connected ? 'Оставьте пустым, чтобы не менять' : 'EAAG...'"
              class="mb-3"
            />

            <VTextField
              v-model="phoneNumberId"
              autocomplete="off"
              data-lpignore="true"
              data-1p-ignore
              label="Phone Number ID (WhatsApp)"
              placeholder="Необязательно, если WhatsApp не используется"
              class="mb-3"
            />

            <VTextField
              v-model="instagramId"
              autocomplete="off"
              data-lpignore="true"
              data-1p-ignore
              label="Instagram Business Account ID"
              placeholder="Необязательно, если Instagram не используется"
              class="mb-3"
            />

            <VTextField
              v-model="pageId"
              autocomplete="off"
              data-lpignore="true"
              data-1p-ignore
              label="Page ID (Facebook Messenger)"
              placeholder="Необязательно, если Messenger не используется"
              class="mb-3"
            />

            <VBtn color="primary" :loading="saving" block @click="save">
              {{ connected ? 'Сохранить изменения' : 'Подключить' }}
            </VBtn>
          </VCardText>
        </VCard>
      </template>
    </div>
  </div>
</template>
