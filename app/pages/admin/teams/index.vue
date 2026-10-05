<script setup lang="ts">
definePageMeta({ middleware: 'ihona-staff' })

const store = useAdminTeamsStore()
onMounted(() => store.fetchAll())

const showCreate = ref(false)
const name = ref('')
const ownerId = ref<number | null>(null)
const saving = ref(false)

async function create() {
  if (name.value.trim() === '' || ownerId.value === null) {
    return
  }
  saving.value = true
  try {
    await store.create({ name: name.value.trim(), user_id: ownerId.value })
    name.value = ''
    ownerId.value = null
    showCreate.value = false
    useToastStore().push('Команда создана', 'success')
  } catch {
    useToastStore().push('Не удалось создать команду', 'error')
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Удалить эту команду? Действие необратимо.')) {
    return
  }
  try {
    await store.remove(id)
    useToastStore().push('Команда удалена', 'success')
  } catch {
    useToastStore().push('Не удалось удалить команду', 'error')
  }
}
</script>

<template>
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold">Команды ({{ store.teams.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <VCard class="mb-4">
        <VCardText>
          <VBtn v-if="!showCreate" prepend-icon="mdi-plus" variant="text" color="primary" @click="showCreate = true">Новая команда</VBtn>
          <div v-else class="flex flex-wrap items-end gap-2">
            <VTextField v-model="name" label="Название" hide-details class="flex-1" />
            <VTextField v-model.number="ownerId" type="number" label="ID владельца (user_id)" hide-details class="flex-1" />
            <VBtn color="primary" :loading="saving" @click="create">Создать</VBtn>
            <VBtn variant="outlined" @click="showCreate = false">Отмена</VBtn>
          </div>
        </VCardText>
      </VCard>

      <div v-if="store.loading" class="text-sm text-medium-emphasis">Загрузка…</div>
      <VCard v-else>
        <VList>
          <VListItem v-for="team in store.teams" :key="team.id">
            <VListItemTitle class="flex items-center gap-2 text-[13px] font-semibold">
              {{ team.name }}
              <VChip v-if="team.personal_team" size="small" variant="tonal">личная</VChip>
            </VListItemTitle>
            <VListItemSubtitle class="text-[11px]">Владелец: {{ team.owner_name ?? `#${team.user_id}` }}</VListItemSubtitle>
            <template #append>
              <VBtn icon="mdi-trash-can-outline" color="error" variant="text" size="small" @click="remove(team.id)" />
            </template>
          </VListItem>
        </VList>
      </VCard>
    </div>
  </div>
</template>
