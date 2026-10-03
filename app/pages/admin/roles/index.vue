<script setup lang="ts">
definePageMeta({ middleware: 'ihona-staff' })

const store = useAdminRolesStore()
onMounted(() => store.fetchAll())

const showCreate = ref(false)
const name = ref('')
const permissions = ref<string[]>([])
const saving = ref(false)

function togglePermission(list: string[], permission: string): string[] {
  return list.includes(permission) ? list.filter((p) => p !== permission) : [...list, permission]
}

async function create() {
  if (name.value.trim() === '') {
    return
  }
  saving.value = true
  try {
    await store.create({ name: name.value.trim(), permissions: permissions.value })
    name.value = ''
    permissions.value = []
    showCreate.value = false
    useToastStore().push('Роль создана', 'success')
  } catch {
    useToastStore().push('Не удалось создать роль', 'error')
  } finally {
    saving.value = false
  }
}

async function togglePermissionOnRole(roleId: number, currentPermissions: string[], permission: string) {
  const role = store.roles.find((r) => r.id === roleId)
  if (!role) {
    return
  }
  try {
    await store.update(roleId, { name: role.name, permissions: togglePermission(currentPermissions, permission) })
  } catch {
    useToastStore().push('Не удалось обновить права', 'error')
  }
}

async function remove(id: number) {
  if (!confirm('Удалить эту роль? Пользователи с этой ролью её потеряют.')) {
    return
  }
  try {
    await store.remove(id)
    useToastStore().push('Роль удалена', 'success')
  } catch {
    useToastStore().push('Не удалось удалить роль', 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="text-[11px] font-medium text-ink-soft">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold text-ink">Роли ({{ store.roles.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <UCard class="mb-4">
        <UButton v-if="!showCreate" icon="i-lucide-plus" variant="link" @click="showCreate = true">Новая роль</UButton>
        <div v-else class="space-y-3">
          <UInput v-model="name" placeholder="Название роли" class="w-full" />
          <div class="flex flex-wrap gap-3">
            <UCheckbox
              v-for="permission in store.availablePermissions"
              :key="permission"
              :model-value="permissions.includes(permission)"
              :label="permission"
              @update:model-value="permissions = togglePermission(permissions, permission)"
            />
          </div>
          <div class="flex gap-2">
            <UButton :loading="saving" @click="create">Создать</UButton>
            <UButton color="neutral" variant="outline" @click="showCreate = false">Отмена</UButton>
          </div>
        </div>
      </UCard>

      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else class="space-y-3">
        <UCard v-for="role in store.roles" :key="role.id">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-display text-sm font-bold text-ink">{{ role.name }}</span>
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="remove(role.id)" />
          </div>
          <div class="flex flex-wrap gap-3">
            <UCheckbox
              v-for="permission in store.availablePermissions"
              :key="permission"
              :model-value="role.permissions.includes(permission)"
              :label="permission"
              @update:model-value="togglePermissionOnRole(role.id, role.permissions, permission)"
            />
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
