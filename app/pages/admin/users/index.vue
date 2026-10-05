<script setup lang="ts">
import type { CrmRole } from '~/stores/auth'

definePageMeta({ middleware: 'ihona-staff' })

const ALL_ROLES: CrmRole[] = ['agent', 'sales-manager', 'developer-admin', 'ihona-staff']

const store = useAdminUsersStore()
onMounted(() => store.fetchAll())

const showCreate = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')
const roles = ref<string[]>([])
const saving = ref(false)

function toggleRole(role: string) {
  roles.value = roles.value.includes(role) ? roles.value.filter((r) => r !== role) : [...roles.value, role]
}

async function create() {
  if (name.value.trim() === '' || email.value.trim() === '' || password.value.length < 8) {
    useToastStore().push('Заполните имя, email и пароль (мин. 8 символов)', 'error')
    return
  }
  saving.value = true
  try {
    await store.create({ name: name.value.trim(), email: email.value.trim(), password: password.value, roles: roles.value })
    name.value = ''
    email.value = ''
    password.value = ''
    roles.value = []
    showCreate.value = false
    useToastStore().push('Пользователь создан', 'success')
  } catch {
    useToastStore().push('Не удалось создать пользователя', 'error')
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Удалить этого пользователя? Действие необратимо.')) {
    return
  }
  try {
    await store.remove(id)
    useToastStore().push('Пользователь удалён', 'success')
  } catch {
    useToastStore().push('Не удалось удалить пользователя', 'error')
  }
}
</script>

<template>
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold">Пользователи ({{ store.users.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <VCard class="mb-4">
        <VCardText>
          <VBtn v-if="!showCreate" prepend-icon="mdi-plus" variant="text" color="primary" @click="showCreate = true">Новый пользователь</VBtn>
          <div v-else class="space-y-3">
            <div class="grid gap-2 sm:grid-cols-3">
              <VTextField v-model="name" label="Имя" hide-details />
              <VTextField v-model="email" type="email" label="Email" hide-details />
              <VTextField v-model="password" type="password" label="Пароль (мин. 8)" hide-details />
            </div>
            <div class="flex flex-wrap gap-3">
              <VCheckbox v-for="role in ALL_ROLES" :key="role" :model-value="roles.includes(role)" :label="role" density="compact" hide-details @update:model-value="toggleRole(role)" />
            </div>
            <div class="flex gap-2">
              <VBtn color="primary" :loading="saving" @click="create">Создать</VBtn>
              <VBtn variant="outlined" @click="showCreate = false">Отмена</VBtn>
            </div>
          </div>
        </VCardText>
      </VCard>

      <div v-if="store.loading" class="text-sm text-medium-emphasis">Загрузка…</div>
      <VCard v-else>
        <VList>
          <VListItem v-for="user in store.users" :key="user.id">
            <VListItemTitle class="text-[13px] font-semibold">{{ user.name }}</VListItemTitle>
            <VListItemSubtitle class="text-[11px]">{{ user.email }}</VListItemSubtitle>
            <div class="mt-1 flex flex-wrap gap-1">
              <VChip v-for="role in user.roles" :key="role" color="success" variant="tonal" size="small">{{ role }}</VChip>
              <span v-if="user.roles.length === 0" class="text-[10px] text-medium-emphasis">без ролей</span>
            </div>
            <template #append>
              <VBtn icon="mdi-trash-can-outline" color="error" variant="text" size="small" @click="remove(user.id)" />
            </template>
          </VListItem>
        </VList>
      </VCard>
    </div>
  </div>
</template>
