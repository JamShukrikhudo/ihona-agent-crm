<script setup lang="ts">
import { AlertTriangle, ShieldCheck } from '@lucide/vue'

const store = useToastStore()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
        :style="toast.kind === 'error' ? { background: '#F8D7DA', color: '#7A1F27' } : { background: 'var(--color-brand-dark)', color: '#fff' }"
        @click="store.dismiss(toast.id)"
      >
        <AlertTriangle v-if="toast.kind === 'error'" :size="16" />
        <ShieldCheck v-else :size="16" />
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
