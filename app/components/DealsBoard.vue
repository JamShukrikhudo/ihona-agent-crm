<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { LEAD_STAGES, LEAD_STAGE_ACCENT, LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import type { Lead, LeadStage } from '~/stores/useLeadsStore'
import type { LostReason } from '~/components/LostReasonModal.vue'
import { STAGE_ICON } from '~/utils/leadStageIcons'

// Contracted and Lost are terminal on the backend (Lead::canTransitionTo)
// — locking `pull` here means the UI reflects that instead of letting an
// agent drag a won/lost card back out, watch it snap back a beat later
// when the API rejects it.
const TERMINAL_STAGES: LeadStage[] = ['contracted', 'lost']

defineEmits<{ 'add-lead': [] }>()

const store = useLeadsStore()

// vue-draggable-plus needs its own mutable array per column (that's how it
// tracks a card moving between lists) — the store's flat `leads` array
// stays the source of truth and these are rebuilt from it whenever it
// changes, so an Echo-driven stage change from another agent's browser
// still shows up here.
const columns = reactive<Record<LeadStage, Lead[]>>(
  Object.fromEntries(LEAD_STAGES.map((stage) => [stage, []])) as Record<LeadStage, Lead[]>,
)

function syncFromStore() {
  for (const stage of LEAD_STAGES) {
    columns[stage] = store.leads.filter((lead) => lead.stage === stage)
  }
}

watch(() => store.leads, syncFromStore, { deep: true })
onMounted(async () => {
  await store.fetchLeads()
  syncFromStore()
})

const pendingLostLead = ref<Lead | null>(null)
const openedLead = ref<Lead | null>(null)

function columnValue(stage: LeadStage): number {
  return columns[stage].reduce((sum, lead) => sum + (lead.unitPrice ?? 0), 0)
}

/**
 * Fires once after any drag completes, regardless of which column moved.
 * Whichever lead is now sitting in a column that doesn't match its own
 * `stage` field is the one that just moved — there's only ever one per
 * drag — so this reconciles that single lead against the API rather than
 * trying to read SortableJS's from/to indices directly.
 */
async function onDragEnd() {
  for (const stage of LEAD_STAGES) {
    const moved = columns[stage].find((lead) => lead.stage !== stage)
    if (!moved) {
      continue
    }

    if (stage === 'lost') {
      // Dropped onto Lost — the modal below asks for a reason before the
      // API call actually fires. Snap the card back to its real column
      // until the modal resolves, rather than showing it in Lost early.
      pendingLostLead.value = moved
      syncFromStore()
      return
    }

    await store.transitionLead(moved.id, stage)
    // transitionLead already patched (or rolled back) store.leads — the
    // watcher above will rebuild `columns` from it, but only on the next
    // tick, so force it now to avoid a flash of the card in the wrong
    // column if the call failed.
    syncFromStore()
    return
  }
}

async function confirmLost(reason: LostReason) {
  const lead = pendingLostLead.value
  pendingLostLead.value = null
  if (!lead) {
    return
  }
  await store.transitionLead(lead.id, 'lost', { lostReason: reason })
  syncFromStore()
}
</script>

<template>
  <div v-if="store.loading" class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="stage in LEAD_STAGES" :key="stage" class="w-72 shrink-0 space-y-2 rounded-2xl bg-paper p-3">
      <div class="h-4 w-24 animate-pulse rounded bg-card" />
      <div class="h-20 animate-pulse rounded-xl bg-card" />
    </div>
  </div>

  <div v-else class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="stage in LEAD_STAGES" :key="stage" :data-stage="stage" class="flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl bg-paper pb-3">
      <div class="h-1 shrink-0" :class="LEAD_STAGE_ACCENT[stage]" />
      <div class="flex items-center justify-between px-3 pt-2">
        <div class="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <component :is="STAGE_ICON[stage]" :size="14" />
          {{ LEAD_STAGE_LABEL[stage] }}
        </div>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{{ columns[stage].length }}</span>
      </div>
      <div v-if="columns[stage].length > 0" class="px-3 text-[10.5px] text-ink-soft">{{ columnValue(stage).toLocaleString('ru-RU') }} TJS</div>

      <VueDraggable
        v-model="columns[stage]"
        :animation="150"
        :group="{ name: 'leads-board', pull: !TERMINAL_STAGES.includes(stage) }"
        class="flex min-h-[80px] flex-col gap-2 px-3"
        @end="onDragEnd"
      >
        <LeadCard v-for="lead in columns[stage]" :key="lead.id" :lead="lead" @open="openedLead = $event" />
      </VueDraggable>

      <div v-if="columns[stage].length === 0" class="mx-3 rounded-xl border border-dashed border-line px-3 py-4 text-center">
        <p class="text-[11px] text-ink-soft/70">Пусто</p>
        <UButton v-if="stage === 'new'" color="primary" variant="link" size="xs" class="mt-1.5 p-0" @click="$emit('add-lead')">
          + Добавить лид
        </UButton>
      </div>
    </div>

    <LostReasonModal v-if="pendingLostLead" @confirm="confirmLost" @cancel="pendingLostLead = null" />
    <LeadDrawer :lead="openedLead" @close="openedLead = null" />
  </div>
</template>
