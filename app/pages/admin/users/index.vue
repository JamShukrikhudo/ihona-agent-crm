<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
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
      <div class="mb-4 rounded-xl border border-line bg-card p-4">
        <button
          v-if="!showCreate"
          type="button"
          class="flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
          @click="showCreate = true"
        >
          <Plus :size="14" /> Новый пользователь
        </button>
        <div v-else class="space-y-3">
          <div class="grid gap-2 sm:grid-cols-3">
            <input v-model="name" type="text" placeholder="Имя" class="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
            <input v-model="email" type="email" placeholder="Email" class="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
            <input v-model="password" type="password" placeholder="Пароль (мин. 8)" class="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          </div>
          <div class="flex flex-wrap gap-3">
            <label v-for="role in ALL_ROLES" :key="role" class="flex items-center gap-1.5 text-[12px] text-ink">
              <input type="checkbox" :checked="roles.includes(role)" @change="toggleRole(role)" /> {{ role }}
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
      <div v-else class="overflow-hidden rounded-xl border border-line bg-card">
        <div v-for="user in store.users" :key="user.id" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <div>
            <div class="text-[13px] font-semibold text-ink">{{ user.name }}</div>
            <div class="text-[11px] text-ink-soft">{{ user.email }}</div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="role in user.roles" :key="role" class="rounded-full bg-status-free-soft px-2 py-0.5 text-[10px] font-semibold text-brand-dark">{{ role }}</span>
              <span v-if="user.roles.length === 0" class="text-[10px] text-ink-soft">без ролей</span>
            </div>
          </div>
          <button type="button" class="text-status-deposit hover:opacity-70" @click="remove(user.id)">
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
