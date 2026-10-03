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
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold text-ink">Команды ({{ store.teams.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <UCard class="mb-4">
        <UButton v-if="!showCreate" icon="i-lucide-plus" variant="link" @click="showCreate = true">Новая команда</UButton>
        <div v-else class="flex flex-wrap items-end gap-2">
          <UFormField label="Название" class="flex-1">
            <UInput v-model="name" class="w-full" />
          </UFormField>
          <UFormField label="ID владельца (user_id)" class="flex-1">
            <UInput v-model.number="ownerId" type="number" class="w-full" />
          </UFormField>
          <UButton :loading="saving" @click="create">Создать</UButton>
          <UButton color="neutral" variant="outline" @click="showCreate = false">Отмена</UButton>
        </div>
      </UCard>

      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <div v-for="team in store.teams" :key="team.id" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <div>
            <div class="flex items-center gap-2 text-[13px] font-semibold text-ink">
              {{ team.name }}
              <UBadge v-if="team.personal_team" color="neutral" variant="subtle" size="sm">личная</UBadge>
            </div>
            <div class="text-[11px] text-ink-soft">Владелец: {{ team.owner_name ?? `#${team.user_id}` }}</div>
          </div>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="remove(team.id)" />
        </div>
      </UCard>
    </div>
  </div>
</template>
