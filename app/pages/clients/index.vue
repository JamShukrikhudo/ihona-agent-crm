<script setup lang="ts">
import { ChevronRight, MessageCircle, Pencil, Plus, Search, Send, Trash2 } from '@lucide/vue'
import type { Client } from '~/stores/useClientsStore'
import { SOURCE_BG, SOURCE_ICON, SOURCE_TEXT, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'

const CHANNEL_ICON: Record<string, typeof Send> = {
  telegram: Send,
  whatsapp: MessageCircle,
}
const CHANNEL_LABEL: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}
function clientSource(client: Client): LeadSource | null {
  return client.source && client.source in SOURCE_ICON ? (client.source as LeadSource) : null
}

definePageMeta({ middleware: 'agent' })

const clientsStore = useClientsStore()
const toast = useToastStore()

const query = ref('')
const clients = ref<Client[]>([])
const loading = ref(true)

const openClientId = ref<number | null>(null)

const editing = ref<Client | null>(null)
const editName = ref('')
const editPhone = ref('')
const editEmail = ref('')
const savingEdit = ref(false)

function openEdit(client: Client) {
  editing.value = client
  editName.value = client.name
  editPhone.value = client.phone
  editEmail.value = client.email ?? ''
}

async function saveEdit() {
  if (!editing.value) {
    return
  }
  savingEdit.value = true
  try {
    const updated = await clientsStore.updateClient(editing.value.id, {
      name: editName.value.trim(),
      phone: editPhone.value.trim(),
      email: editEmail.value.trim() || null,
    })
    const idx = clients.value.findIndex((c) => c.id === updated.id)
    if (idx !== -1) {
      clients.value[idx] = { ...clients.value[idx], ...updated }
    }
    editing.value = null
  } catch {
    toast.push('Не удалось сохранить изменения', 'error')
  } finally {
    savingEdit.value = false
  }
}

const creating = ref(false)
const newName = ref('')
const newPhone = ref('')
const newNote = ref('')
const savingNew = ref(false)

async function saveNewClient() {
  if (newName.value.trim() === '' || newPhone.value.trim() === '') {
    return
  }
  savingNew.value = true
  try {
    let created = await clientsStore.findOrCreateByPhone(newPhone.value.trim(), newName.value.trim())
    if (newNote.value.trim() !== '') {
      created = await clientsStore.updateClient(created.id, { notes: newNote.value.trim() })
    }
    clients.value = [created, ...clients.value.filter((c) => c.id !== created.id)]
    creating.value = false
    newName.value = ''
    newPhone.value = ''
    newNote.value = ''
  } catch {
    toast.push('Не удалось создать клиента — возможно, номер уже занят', 'error')
  } finally {
    savingNew.value = false
  }
}

async function removeClient(client: Client) {
  if (!confirm(`Удалить клиента ${client.name}? Это действие необратимо.`)) {
    return
  }
  try {
    await clientsStore.deleteClient(client.id)
    clients.value = clients.value.filter((c) => c.id !== client.id)
  } catch {
    toast.push('Не удалось удалить клиента', 'error')
  }
}

async function load() {
  loading.value = true
  try {
    const isPhoneLike = /\d/.test(query.value)
    const params = query.value.trim() === '' ? {} : isPhoneLike ? { phone: query.value } : { q: query.value }
    const res = await apiFetch<{ data: Client[] }>('/clients', { params })
    // Newest-created first is the closest proxy to "last activity" the
    // index endpoint currently supports — a real last-activity sort would
    // need it to join client_interactions, not worth it before this list
    // has more than a handful of clients.
    clients.value = [...res.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(query, () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(load, 250)
})

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Клиенты</div>
          <h1 class="font-display text-xl font-bold text-ink">Все клиенты</h1>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              v-model="query"
              type="text"
              placeholder="Поиск по имени или телефону"
              class="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
            @click="creating = true"
          >
            <Plus :size="14" /> Клиент
          </button>
        </div>
      </div>
    </div>

    <div class="px-6 py-6">
      <div v-if="loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else-if="clients.length === 0" class="rounded-2xl border border-dashed border-line bg-card p-8 text-center">
        <p class="text-sm text-ink-soft">{{ query ? 'Ничего не найдено по этому запросу.' : 'Клиентов пока нет.' }}</p>
        <button
          v-if="!query"
          type="button"
          class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
          @click="creating = true"
        >
          <Plus :size="14" /> Добавить первого клиента
        </button>
      </div>

      <div v-else class="overflow-hidden rounded-2xl border border-line bg-card">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-line bg-paper">
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Клиент</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Канал</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Источник</th>
              <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Дата</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="client in clients"
              :key="client.id"
              class="cursor-pointer border-b border-line last:border-b-0 hover:bg-paper"
              @click="openClientId = client.id"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <AgentAvatar :name="client.name" :size="32" />
                  <div class="min-w-0">
                    <div class="truncate text-[13px] font-semibold text-ink">{{ client.name }}</div>
                    <div class="text-[11px] text-ink-soft">{{ client.phone }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <template v-for="ch in client.channels ?? []" :key="ch">
                    <span
                      v-if="CHANNEL_ICON[ch]"
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-brand-600"
                      :title="CHANNEL_LABEL[ch]"
                    >
                      <component :is="CHANNEL_ICON[ch]" :size="13" />
                    </span>
                  </template>
                  <span v-if="!client.channels?.length" class="text-[11px] text-ink-soft">—</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="clientSource(client)"
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="[SOURCE_BG[clientSource(client)!], SOURCE_TEXT[clientSource(client)!]]"
                >
                  <component :is="SOURCE_ICON[clientSource(client)!]" :size="11" /> {{ sourceLabel(client.source) }}
                </span>
                <span v-else class="text-[11px] text-ink-soft">—</span>
              </td>
              <td class="px-4 py-3 text-[12px] text-ink-soft">{{ new Date(client.createdAt).toLocaleDateString('ru-RU') }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-brand-600"
                    title="Редактировать"
                    @click.stop="openEdit(client)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-status-deposit-soft hover:text-status-deposit"
                    title="Удалить"
                    @click.stop="removeClient(client)"
                  >
                    <Trash2 :size="14" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-brand-600"
                    title="Открыть карточку"
                    @click.stop="openClientId = client.id"
                  >
                    <ChevronRight :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="creating" class="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4" @click="creating = false">
      <div class="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl" @click.stop>
        <div class="mb-4 font-display text-base font-bold text-ink">Новый клиент</div>
        <form class="space-y-3" @submit.prevent="saveNewClient">
          <label class="block text-[11px] text-ink-soft">
            Имя
            <input v-model="newName" type="text" required class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <label class="block text-[11px] text-ink-soft">
            Телефон
            <input v-model="newPhone" type="text" required placeholder="+992..." class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <label class="block text-[11px] text-ink-soft">
            Заметка
            <textarea v-model="newNote" rows="2" class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <div class="flex gap-2 pt-2">
            <button type="button" class="flex-1 rounded-lg border border-line py-2 text-[13px] font-semibold text-ink-soft" @click="creating = false">
              Отмена
            </button>
            <button
              type="submit"
              :disabled="savingNew"
              class="flex-1 rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {{ savingNew ? 'Создаю…' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="editing" class="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4" @click="editing = null">
      <div class="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl" @click.stop>
        <div class="mb-4 font-display text-base font-bold text-ink">Редактировать клиента</div>
        <form class="space-y-3" @submit.prevent="saveEdit">
          <label class="block text-[11px] text-ink-soft">
            Имя
            <input v-model="editName" type="text" required class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <label class="block text-[11px] text-ink-soft">
            Телефон
            <input v-model="editPhone" type="text" required class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <label class="block text-[11px] text-ink-soft">
            Email
            <input v-model="editEmail" type="email" class="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink" />
          </label>
          <div class="flex gap-2 pt-2">
            <button type="button" class="flex-1 rounded-lg border border-line py-2 text-[13px] font-semibold text-ink-soft" @click="editing = null">
              Отмена
            </button>
            <button
              type="submit"
              :disabled="savingEdit"
              class="flex-1 rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {{ savingEdit ? 'Сохраняю…' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ClientDrawer v-if="openClientId" :client-id="openClientId" @close="openClientId = null" />
  </div>
</template>
