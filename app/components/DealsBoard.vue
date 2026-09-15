<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { LEAD_STAGES, LEAD_STAGE_LABEL } from '~/stores/useLeadsStore'
import type { Lead, LeadStage } from '~/stores/useLeadsStore'

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
      const reason = window.prompt('Причина отказа (price_disagreement, financing_fell_through, buyer_withdrew, unit_no_longer_available, unresponsive, other):', 'other')
      if (!reason) {
        syncFromStore()
        return
      }
      await store.transitionLead(moved.id, stage, { lostReason: reason })
    } else {
      await store.transitionLead(moved.id, stage)
    }

    // transitionLead already patched (or rolled back) store.leads — the
    // watcher above will rebuild `columns` from it, but only on the next
    // tick, so force it now to avoid a flash of the card in the wrong
    // column if the call failed.
    syncFromStore()
    return
  }
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="stage in LEAD_STAGES" :key="stage" class="flex w-72 shrink-0 flex-col gap-3 rounded-2xl bg-paper p-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="font-display text-sm font-bold text-ink">{{ LEAD_STAGE_LABEL[stage] }}</h2>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{{ columns[stage].length }}</span>
      </div>

      <VueDraggable
        v-model="columns[stage]"
        :animation="150"
        group="leads-board"
        class="flex min-h-[80px] flex-col gap-2"
        @end="onDragEnd"
      >
        <LeadCard v-for="lead in columns[stage]" :key="lead.id" :lead="lead" />
      </VueDraggable>
    </div>
  </div>
</template>
