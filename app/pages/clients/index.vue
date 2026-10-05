<script setup lang="ts">
import { MessageCircle, Send } from '@lucide/vue'
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

const headers = [
  { title: 'Клиент', key: 'name' },
  { title: 'Канал', key: 'channels', sortable: false },
  { title: 'Источник', key: 'source', sortable: false },
  { title: 'Менеджер', key: 'assignedAgentName' },
  { title: 'Дата', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const editing = ref<Client | null>(null)
const editOpen = ref(false)
const editName = ref('')
const editPhone = ref('')
const editEmail = ref('')
const editRegion = ref('')
const editAssignedAgentId = ref('none')
const savingEdit = ref(false)

const teamAgents = ref<TeamAgent[]>([])
onMounted(() => {
  clientsStore.fetchTeamAgents().then((agents) => { teamAgents.value = agents })
})
function agentName(id: number | null): string {
  return teamAgents.value.find((a) => a.id === id)?.name ?? '—'
}
// Nuxt UI's <USelectItem> rejects an empty-string value outright (it's
// reserved to mean "clear selection") — 'none' stands in for "unassigned"
// and is converted back to '' at the ref boundary (saveEdit below).
const agentOptions = computed(() => [{ label: 'Не назначен', value: 'none' }, ...teamAgents.value.map((a) => ({ label: a.name, value: String(a.id) }))])

function openEdit(client: Client) {
  editing.value = client
  editName.value = client.name
  editPhone.value = client.phone
  editEmail.value = client.email ?? ''
  editRegion.value = client.region ?? ''
  editAssignedAgentId.value = client.assignedAgentId ? String(client.assignedAgentId) : 'none'
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
      assigned_agent_id: editAssignedAgentId.value === 'none' ? null : Number(editAssignedAgentId.value),
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
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-light bg-surface px-6 py-4">
      <div>
        <div class="text-[11px] font-medium text-medium-emphasis">Клиенты</div>
        <h1 class="font-display text-xl font-bold">Все клиенты</h1>
      </div>
      <div class="flex items-center gap-2">
        <VTextField v-model="query" prepend-inner-icon="mdi-magnify" placeholder="Поиск по имени или телефону" hide-details density="compact" style="width: 256px" />
        <VBtn prepend-icon="mdi-plus" color="primary" @click="creating = true">Клиент</VBtn>
      </div>
    </div>

    <div class="px-6 py-6">
      <VCard v-if="!loading && clients.length === 0" variant="outlined" class="border-dashed p-8 text-center">
        <p class="text-sm text-medium-emphasis">{{ query ? 'Ничего не найдено по этому запросу.' : 'Клиентов пока нет.' }}</p>
        <VBtn v-if="!query" prepend-icon="mdi-plus" color="primary" class="mt-3" @click="creating = true">Добавить первого клиента</VBtn>
      </VCard>

      <VCard v-else>
        <VDataTable
          :headers="headers"
          :items="clients"
          :loading="loading"
          item-value="id"
          @click:row="(_e: Event, { item }: { item: Client }) => (openClientId = item.id)"
        >
          <template #item.name="{ item }">
            <div class="flex items-center gap-3 py-2">
              <AgentAvatar :name="item.name" :size="32" />
              <div class="min-w-0">
                <div class="truncate text-[13px] font-semibold">{{ item.name }}</div>
                <div class="text-[11px] text-medium-emphasis">{{ item.phone }}</div>
              </div>
            </div>
          </template>

          <template #item.channels="{ item }">
            <div class="flex items-center gap-1.5">
              <template v-for="ch in item.channels ?? []" :key="ch">
                <VAvatar v-if="CHANNEL_ICON[ch]" size="28" color="primary" variant="tonal" :title="CHANNEL_LABEL[ch]">
                  <component :is="CHANNEL_ICON[ch]" :size="13" />
                </VAvatar>
              </template>
              <span v-if="!item.channels?.length" class="text-[11px] text-medium-emphasis">—</span>
            </div>
          </template>

          <template #item.source="{ item }">
            <VChip v-if="clientSource(item)" size="small" variant="tonal" :class="[SOURCE_BG[clientSource(item)!], SOURCE_TEXT[clientSource(item)!]]">
              <component :is="SOURCE_ICON[clientSource(item)!]" :size="11" /> {{ sourceLabel(item.source) }}
            </VChip>
            <span v-else class="text-[11px] text-medium-emphasis">—</span>
          </template>

          <template #item.assignedAgentName="{ item }">
            <span class="text-[12px] text-medium-emphasis">{{ item.assignedAgentName ?? agentName(item.assignedAgentId) }}</span>
          </template>

          <template #item.createdAt="{ item }">
            <span class="text-[12px] text-medium-emphasis">{{ new Date(item.createdAt).toLocaleDateString('ru-RU') }}</span>
          </template>

          <template #item.actions="{ item }">
            <div class="flex items-center justify-end gap-1">
              <VBtn icon="mdi-pencil-outline" color="default" variant="text" size="small" title="Редактировать" @click.stop="openEdit(item)" />
              <VBtn icon="mdi-trash-can-outline" color="error" variant="text" size="small" title="Удалить" @click.stop="removeClient(item)" />
              <VBtn icon="mdi-chevron-right" color="default" variant="text" size="small" title="Открыть карточку" @click.stop="openClientId = item.id" />
            </div>
          </template>
        </VDataTable>
      </VCard>
    </div>

    <VDialog v-model="creating" max-width="480">
      <VCard title="Новый клиент">
        <VCardText>
          <form id="new-client-form" class="space-y-3" @submit.prevent="saveNewClient">
            <VTextField v-model="newName" label="Имя" required />
            <VTextField v-model="newPhone" label="Телефон" placeholder="+992..." required />
            <VTextarea v-model="newNote" label="Заметка" rows="2" />
          </form>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="outlined" @click="creating = false">Отмена</VBtn>
          <VBtn type="submit" form="new-client-form" color="primary" :loading="savingNew">Создать</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="editOpen" max-width="480">
      <VCard title="Редактировать клиента">
        <VCardText>
          <form id="edit-client-form" class="space-y-3" @submit.prevent="saveEdit">
            <VTextField v-model="editName" label="Имя" required />
            <VTextField v-model="editPhone" label="Телефон" required />
            <VTextField v-model="editEmail" label="Email" type="email" />
            <VSelect v-model="editAssignedAgentId" :items="agentOptions" item-title="label" item-value="value" label="Менеджер" />
            <VTextField v-model="editRegion" label="Регион" placeholder="Например, Душанбе" />
          </form>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="outlined" @click="editOpen = false">Отмена</VBtn>
          <VBtn type="submit" form="edit-client-form" color="primary" :loading="savingEdit">Сохранить</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <ClientDrawer v-if="openClientId" :client-id="openClientId" @close="openClientId = null" />
  </div>
</template>
