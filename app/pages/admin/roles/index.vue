<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'

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
      <div class="mb-4 rounded-xl border border-line bg-card p-4">
        <button
          v-if="!showCreate"
          type="button"
          class="flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
          @click="showCreate = true"
        >
          <Plus :size="14" /> Новая роль
        </button>
        <div v-else class="space-y-3">
          <input v-model="name" type="text" placeholder="Название роли" class="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          <div class="flex flex-wrap gap-3">
            <label v-for="permission in store.availablePermissions" :key="permission" class="flex items-center gap-1.5 text-[12px] text-ink">
              <input
                type="checkbox"
                :checked="permissions.includes(permission)"
                @change="permissions = togglePermission(permissions, permission)"
              /> {{ permission }}
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              :disabled="saving"
              class="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              @click="create"
            >
              Создать
            </button>
            <button type="button" class="rounded-lg border border-line px-4 py-2 text-[13px] text-ink hover:bg-paper" @click="showCreate = false">Отмена</button>
          </div>
        </div>
      </div>

      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else class="space-y-3">
        <div v-for="role in store.roles" :key="role.id" class="rounded-xl border border-line bg-card p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-display text-sm font-bold text-ink">{{ role.name }}</span>
            <button type="button" class="text-status-deposit hover:opacity-70" @click="remove(role.id)">
              <Trash2 :size="15" />
            </button>
          </div>
          <div class="flex flex-wrap gap-3">
            <label v-for="permission in store.availablePermissions" :key="permission" class="flex items-center gap-1.5 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                :checked="role.permissions.includes(permission)"
                @change="togglePermissionOnRole(role.id, role.permissions, permission)"
              /> {{ permission }}
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
