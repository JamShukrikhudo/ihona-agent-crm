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
  <div>
    <div class="border-b border-surface-light bg-surface px-6 py-4">
      <div class="text-[11px] font-medium text-medium-emphasis">Платформа ihona</div>
      <h1 class="font-display text-xl font-bold">Роли ({{ store.roles.length }})</h1>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-6">
      <VCard class="mb-4">
        <VCardText>
          <VBtn v-if="!showCreate" prepend-icon="mdi-plus" variant="text" color="primary" @click="showCreate = true">Новая роль</VBtn>
          <div v-else class="space-y-3">
            <VTextField v-model="name" label="Название роли" hide-details />
            <div class="flex flex-wrap gap-3">
              <VCheckbox
                v-for="permission in store.availablePermissions"
                :key="permission"
                :model-value="permissions.includes(permission)"
                :label="permission"
                density="compact"
                hide-details
                @update:model-value="permissions = togglePermission(permissions, permission)"
              />
            </div>
            <div class="flex gap-2">
              <VBtn color="primary" :loading="saving" @click="create">Создать</VBtn>
              <VBtn variant="outlined" @click="showCreate = false">Отмена</VBtn>
            </div>
          </div>
        </VCardText>
      </VCard>

      <div v-if="store.loading" class="text-sm text-medium-emphasis">Загрузка…</div>
      <div v-else class="space-y-3">
        <VCard v-for="role in store.roles" :key="role.id">
          <VCardText>
            <div class="mb-2 flex items-center justify-between">
              <span class="font-display text-sm font-bold">{{ role.name }}</span>
              <VBtn icon="mdi-trash-can-outline" color="error" variant="text" size="small" @click="remove(role.id)" />
            </div>
            <div class="flex flex-wrap gap-3">
              <VCheckbox
                v-for="permission in store.availablePermissions"
                :key="permission"
                :model-value="role.permissions.includes(permission)"
                :label="permission"
                density="compact"
                hide-details
                @update:model-value="togglePermissionOnRole(role.id, role.permissions, permission)"
              />
            </div>
          </VCardText>
        </VCard>
      </div>
    </div>
  </div>
</template>
