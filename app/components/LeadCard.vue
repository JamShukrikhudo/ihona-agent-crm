<script setup lang="ts">
import { AlertCircle, Building2, CalendarClock } from '@lucide/vue'
import { LAST_CALL_COLOR, LAST_CALL_LABEL } from '~/stores/useLeadsStore'
import type { Lead } from '~/stores/useLeadsStore'
import { SOURCE_ICON, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'
import { relativeTime } from '~/utils/relativeTime'

// Solid tag color per source — the reference's kanban cards carry one
// solid-color tag each (Design/Mobile/Development), not the soft-tint
// badges used elsewhere in this app; kept local to this card rather than
// widening leadSources.ts's exported palette, which other screens (the
// clients table, the lead drawer) still use in the soft style.
const SOURCE_SOLID: Record<LeadSource, string> = {
  phone: 'bg-sky-600',
  referral: 'bg-amber-600',
  site: 'bg-brand-600',
  instagram: 'bg-pink-600',
}

const props = defineProps<{ lead: Lead }>()
defineEmits<{ open: [lead: Lead] }>()

const source = computed(() => (props.lead.source && props.lead.source in SOURCE_ICON ? (props.lead.source as LeadSource) : null))
</script>

<template>
  <div
    class="relative cursor-grab space-y-2 overflow-hidden rounded-xl border border-line bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
    :class="{ 'opacity-60': lead.stage === 'lost' }"
    @click="$emit('open', lead)"
  >
    <span
      v-if="source"
      class="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg px-2 py-1 text-[9.5px] font-bold text-white"
      :class="SOURCE_SOLID[source]"
    >
      <component :is="SOURCE_ICON[source]" :size="10" /> {{ sourceLabel(lead.source) }}
    </span>

    <div class="flex items-center justify-between gap-2 pr-14">
      <div class="min-w-0">
        <div class="truncate font-semibold text-ink">{{ lead.contactName }}</div>
        <div v-if="lead.contactPhone" class="text-[12px] text-ink-soft">{{ lead.contactPhone }}</div>
      </div>
      <AgentAvatar v-if="lead.agent" :name="lead.agent" :size="24" :title="lead.agent" />
    </div>

    <div v-if="lead.lastCallType" class="flex items-center gap-1.5 text-[10.5px] font-semibold" :class="LAST_CALL_COLOR[lead.lastCallType]">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {{ LAST_CALL_LABEL[lead.lastCallType] }}
    </div>

    <div v-if="lead.unitLabel" class="flex items-center gap-1 text-[11px] text-ink-soft">
      <Building2 :size="11" /> {{ lead.unitLabel }}
    </div>

    <div class="flex items-center justify-between border-t border-line pt-2">
      <span class="flex items-center gap-1 text-[10px] text-ink-soft" :title="new Date(lead.createdAt).toLocaleString('ru-RU')">
        <CalendarClock :size="11" /> {{ relativeTime(lead.createdAt) }}
      </span>

      <span v-if="lead.unitPrice" class="text-[11.5px] font-semibold text-ink">{{ lead.unitPrice.toLocaleString('ru-RU') }} TJS</span>
      <span
        v-else-if="lead.nextTask"
        class="flex items-center gap-1 text-[10px] font-semibold"
        :class="lead.nextTask.overdue ? 'text-status-deposit' : 'text-ink-soft'"
      >
        <AlertCircle v-if="lead.nextTask.overdue" :size="11" />
        {{ lead.nextTask.title }}
      </span>
    </div>
  </div>
</template>
