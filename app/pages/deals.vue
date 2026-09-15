<script setup lang="ts">
import { Plus } from '@lucide/vue'

definePageMeta({ middleware: 'sales-manager' })

const auth = useAuthStore()
const store = useLeadsStore()

const formOpen = ref(false)
const contactName = ref('')
const contactPhone = ref('')

async function submitLead() {
  if (contactName.value.trim() === '') {
    return
  }
  await store.createLead({ contact_name: contactName.value.trim(), contact_phone: contactPhone.value.trim() || undefined })
  contactName.value = ''
  contactPhone.value = ''
  formOpen.value = false
}

onMounted(() => {
  if (auth.user?.teamId == null) {
    return
  }

  // Same reasoning as the chessboard's own subscription: a teammate moving
  // a card in their own browser should repaint this board without a
  // reload.
  useEcho().private(`team.${auth.user.teamId}.leads`).listen('.lead.stage-changed', (payload: { leadId: number; to: string }) => {
    store.patchLead(payload.leadId, { stage: payload.to as import('~/stores/useLeadsStore').LeadStage })
  })
})

onBeforeUnmount(() => {
  if (auth.user?.teamId != null) {
    useEcho().leave(`team.${auth.user.teamId}.leads`)
  }
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <div class="border-b border-line bg-card px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-medium text-ink-soft">Воронка сделок</div>
          <h1 class="font-display text-xl font-bold text-ink">Лиды и брони</h1>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          @click="formOpen = !formOpen"
        >
          <Plus :size="14" /> Новый лид
        </button>
      </div>

      <form v-if="formOpen" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-paper p-3" @submit.prevent="submitLead">
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Имя контакта
          <input v-model="contactName" type="text" required class="w-48 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] text-ink-soft">
          Телефон
          <input v-model="contactPhone" type="text" class="w-40 rounded-lg border border-line px-2 py-1 text-sm text-ink" />
        </label>
        <button type="submit" class="rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700">
          Добавить
        </button>
      </form>
    </div>

    <div class="px-6 py-6">
      <DealsBoard />
    </div>
  </div>
</template>
