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
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold text-ink">Пользователи ({{ store.users.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <UCard class="mb-4">
        <UButton v-if="!showCreate" icon="i-lucide-plus" variant="link" @click="showCreate = true">Новый пользователь</UButton>
        <div v-else class="space-y-3">
          <div class="grid gap-2 sm:grid-cols-3">
            <UInput v-model="name" placeholder="Имя" />
            <UInput v-model="email" type="email" placeholder="Email" />
            <UInput v-model="password" type="password" placeholder="Пароль (мин. 8)" />
          </div>
          <div class="flex flex-wrap gap-3">
            <UCheckbox v-for="role in ALL_ROLES" :key="role" :model-value="roles.includes(role)" :label="role" @update:model-value="toggleRole(role)" />
          </div>
          <div class="flex gap-2">
            <UButton :loading="saving" @click="create">Создать</UButton>
            <UButton color="neutral" variant="outline" @click="showCreate = false">Отмена</UButton>
          </div>
        </div>
      </UCard>

      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <div v-for="user in store.users" :key="user.id" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <div>
            <div class="text-[13px] font-semibold text-ink">{{ user.name }}</div>
            <div class="text-[11px] text-ink-soft">{{ user.email }}</div>
            <div class="mt-1 flex flex-wrap gap-1">
              <UBadge v-for="role in user.roles" :key="role" color="success" variant="subtle" size="sm">{{ role }}</UBadge>
              <span v-if="user.roles.length === 0" class="text-[10px] text-ink-soft">без ролей</span>
            </div>
          </div>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="remove(user.id)" />
        </div>
      </UCard>
    </div>
  </div>
</template>
