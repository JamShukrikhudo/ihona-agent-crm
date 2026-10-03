<script setup lang="ts">
import { MessageCircle, Send } from '@lucide/vue'
import type { TableColumn } from '@nuxt/ui'
import type { Client, TeamAgent } from '~/stores/useClientsStore'
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

const columns: TableColumn<Client>[] = [
  { accessorKey: 'name', header: 'Клиент' },
  { accessorKey: 'channels', header: 'Канал' },
  { accessorKey: 'source', header: 'Источник' },
  { accessorKey: 'assignedAgentName', header: 'Менеджер' },
  { accessorKey: 'createdAt', header: 'Дата' },
  { accessorKey: 'id', header: '' },
]

const editing = ref<Client | null>(null)
const editOpen = ref(false)
const editName = ref('')
const editPhone = ref('')
const editEmail = ref('')
const editRegion = ref('')
const editAssignedAgentId = ref('')
const savingEdit = ref(false)

const teamAgents = ref<TeamAgent[]>([])
onMounted(() => {
  clientsStore.fetchTeamAgents().then((agents) => { teamAgents.value = agents })
})
function agentName(id: number | null): string {
  return teamAgents.value.find((a) => a.id === id)?.name ?? '—'
}
const agentOptions = computed(() => [{ label: 'Не назначен', value: '' }, ...teamAgents.value.map((a) => ({ label: a.name, value: String(a.id) }))])

function openEdit(client: Client) {
  editing.value = client
  editName.value = client.name
  editPhone.value = client.phone
  editEmail.value = client.email ?? ''
  editRegion.value = client.region ?? ''
  editAssignedAgentId.value = client.assignedAgentId ? String(client.assignedAgentId) : ''
  editOpen.value = true
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
      region: editRegion.value.trim() || null,
      assigned_agent_id: editAssignedAgentId.value === '' ? null : Number(editAssignedAgentId.value),
    })
    const idx = clients.value.findIndex((c) => c.id === updated.id)
    if (idx !== -1) {
      clients.value[idx] = { ...clients.value[idx], ...updated }
    }
    editOpen.value = false
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
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-6 py-4">
      <div>
        <div class="text-[11px] font-medium text-ink-soft">Клиенты</div>
        <h1 class="font-display text-xl font-bold text-ink">Все клиенты</h1>
      </div>
      <div class="flex items-center gap-2">
        <UInput v-model="query" icon="i-lucide-search" placeholder="Поиск по имени или телефону" class="w-64" />
        <UButton icon="i-lucide-plus" @click="creating = true">Клиент</UButton>
      </div>
    </div>

    <div class="px-6 py-6">
      <div v-if="!loading && clients.length === 0" class="rounded-2xl border border-dashed border-line bg-card p-8 text-center">
        <p class="text-sm text-ink-soft">{{ query ? 'Ничего не найдено по этому запросу.' : 'Клиентов пока нет.' }}</p>
        <UButton v-if="!query" icon="i-lucide-plus" class="mt-3" @click="creating = true">Добавить первого клиента</UButton>
      </div>

      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <UTable
          :data="clients"
          :columns="columns"
          :loading="loading"
          @select="(_e, row) => (openClientId = row.original.id)"
        >
          <template #name-cell="{ row }">
            <div class="flex items-center gap-3">
              <AgentAvatar :name="row.original.name" :size="32" />
              <div class="min-w-0">
                <div class="truncate text-[13px] font-semibold text-ink">{{ row.original.name }}</div>
                <div class="text-[11px] text-ink-soft">{{ row.original.phone }}</div>
              </div>
            </div>
          </template>

          <template #channels-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <template v-for="ch in row.original.channels ?? []" :key="ch">
                <span
                  v-if="CHANNEL_ICON[ch]"
                  class="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-brand-600"
                  :title="CHANNEL_LABEL[ch]"
                >
                  <component :is="CHANNEL_ICON[ch]" :size="13" />
                </span>
              </template>
              <span v-if="!row.original.channels?.length" class="text-[11px] text-ink-soft">—</span>
            </div>
          </template>

          <template #source-cell="{ row }">
            <UBadge v-if="clientSource(row.original)" variant="subtle" :class="[SOURCE_BG[clientSource(row.original)!], SOURCE_TEXT[clientSource(row.original)!]]">
              <component :is="SOURCE_ICON[clientSource(row.original)!]" :size="11" /> {{ sourceLabel(row.original.source) }}
            </UBadge>
            <span v-else class="text-[11px] text-ink-soft">—</span>
          </template>

          <template #assignedAgentName-cell="{ row }">
            <span class="text-[12px] text-ink-soft">{{ row.original.assignedAgentName ?? agentName(row.original.assignedAgentId) }}</span>
          </template>

          <template #createdAt-cell="{ row }">
            <span class="text-[12px] text-ink-soft">{{ new Date(row.original.createdAt).toLocaleDateString('ru-RU') }}</span>
          </template>

          <template #id-cell="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" title="Редактировать" @click.stop="openEdit(row.original)" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" title="Удалить" @click.stop="removeClient(row.original)" />
              <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" size="xs" title="Открыть карточку" @click.stop="openClientId = row.original.id" />
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <UModal v-model:open="creating" title="Новый клиент">
      <template #body>
        <form id="new-client-form" class="space-y-3" @submit.prevent="saveNewClient">
          <UFormField label="Имя" required>
            <UInput v-model="newName" class="w-full" />
          </UFormField>
          <UFormField label="Телефон" required>
            <UInput v-model="newPhone" placeholder="+992..." class="w-full" />
          </UFormField>
          <UFormField label="Заметка">
            <UTextarea v-model="newNote" :rows="2" class="w-full" />
          </UFormField>
        </form>
      </template>
      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" @click="close">Отмена</UButton>
        <UButton type="submit" form="new-client-form" :loading="savingNew" class="ml-auto">Создать</UButton>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" title="Редактировать клиента">
      <template #body>
        <form id="edit-client-form" class="space-y-3" @submit.prevent="saveEdit">
          <UFormField label="Имя" required>
            <UInput v-model="editName" class="w-full" />
          </UFormField>
          <UFormField label="Телефон" required>
            <UInput v-model="editPhone" class="w-full" />
          </UFormField>
          <UFormField label="Email">
            <UInput v-model="editEmail" type="email" class="w-full" />
          </UFormField>
          <UFormField label="Менеджер">
            <USelect v-model="editAssignedAgentId" :items="agentOptions" class="w-full" />
          </UFormField>
          <UFormField label="Регион">
            <UInput v-model="editRegion" placeholder="Например, Душанбе" class="w-full" />
          </UFormField>
        </form>
      </template>
      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" @click="close">Отмена</UButton>
        <UButton type="submit" form="edit-client-form" :loading="savingEdit" class="ml-auto">Сохранить</UButton>
      </template>
    </UModal>

    <ClientDrawer v-if="openClientId" :client-id="openClientId" @close="openClientId = null" />
  </div>
</template>
