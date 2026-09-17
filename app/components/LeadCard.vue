<script setup lang="ts">
import { AlertCircle, Building2, Clock } from '@lucide/vue'
import type { Lead } from '~/stores/useLeadsStore'
import { SOURCE_BG, SOURCE_ICON, SOURCE_TEXT, sourceLabel } from '~/utils/leadSources'
import type { LeadSource } from '~/utils/leadSources'

const props = defineProps<{ lead: Lead }>()
defineEmits<{ open: [lead: Lead] }>()

const source = computed(() => (props.lead.source && props.lead.source in SOURCE_ICON ? (props.lead.source as LeadSource) : null))
</script>

<template>
  <div
    class="cursor-grab space-y-2 rounded-xl border border-line bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
    :class="{ 'opacity-60': lead.stage === 'lost' }"
    @click="$emit('open', lead)"
  >
    <div class="font-semibold text-ink">{{ lead.contactName }}</div>
    <div v-if="lead.contactPhone" class="text-[12px] text-ink-soft">{{ lead.contactPhone }}</div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span
        v-if="source"
        class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        :class="[SOURCE_BG[source], SOURCE_TEXT[source]]"
      >
        <component :is="SOURCE_ICON[source]" :size="10" /> {{ sourceLabel(lead.source) }}
      </span>
      <span v-if="lead.unitLabel" class="flex items-center gap-1 rounded-full bg-status-free-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark">
        <Building2 :size="10" /> {{ lead.unitLabel }}
      </span>
    </div>

    <div class="flex items-center justify-between pt-0.5">
      <span v-if="lead.unitPrice" class="text-[11.5px] font-semibold text-ink">{{ lead.unitPrice.toLocaleString('ru-RU') }} TJS</span>
      <span v-else class="text-[11px] text-ink-soft">Юнит не выбран</span>

      <span
        v-if="lead.nextTask"
        class="flex items-center gap-1 text-[10px] font-semibold"
        :class="lead.nextTask.overdue ? 'text-status-deposit' : 'text-ink-soft'"
      >
        <component :is="lead.nextTask.overdue ? AlertCircle : Clock" :size="11" />
        {{ lead.nextTask.title }}
      </span>
    </div>
  </div>
</template>
