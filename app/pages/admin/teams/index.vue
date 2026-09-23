<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'

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
      <div class="mb-4 rounded-xl border border-line bg-card p-4">
        <button
          v-if="!showCreate"
          type="button"
          class="flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
          @click="showCreate = true"
        >
          <Plus :size="14" /> Новая команда
        </button>
        <div v-else class="flex flex-wrap items-end gap-2">
          <div class="flex-1">
            <label class="mb-1 block text-[12px] text-ink-soft">Название</label>
            <input v-model="name" type="text" class="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-[12px] text-ink-soft">ID владельца (user_id)</label>
            <input v-model.number="ownerId" type="number" class="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          </div>
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

      <div v-if="store.loading" class="text-sm text-ink-soft">Загрузка…</div>
      <div v-else class="overflow-hidden rounded-xl border border-line bg-card">
        <div v-for="team in store.teams" :key="team.id" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
          <div>
            <div class="flex items-center gap-2 text-[13px] font-semibold text-ink">
              {{ team.name }}
              <span v-if="team.personal_team" class="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-soft">личная</span>
            </div>
            <div class="text-[11px] text-ink-soft">Владелец: {{ team.owner_name ?? `#${team.user_id}` }}</div>
          </div>
          <button type="button" class="text-status-deposit hover:opacity-70" @click="remove(team.id)">
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
