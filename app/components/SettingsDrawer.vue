<script setup lang="ts">
import { Check, Moon, Settings, Sun, X } from '@lucide/vue'
import { ACCENTS } from '~/composables/useUiPrefs'
import type { AccentKey } from '~/composables/useUiPrefs'

const { prefs, load, setTheme, setAccent, setSidebar } = useUiPrefs()
const open = ref(false)

onMounted(load)

const ACCENT_ORDER: AccentKey[] = ['emerald', 'blue', 'violet', 'teal', 'orange']
</script>

<template>
  <!-- Floating gear, same corner as the Spike Admin reference the user
       pointed at — each agent's own device preference, not team data. -->
  <button
    type="button"
    class="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700"
    title="Настройки интерфейса"
    @click="open = true"
  >
    <Settings :size="18" />
  </button>

  <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-black/25" @click="open = false">
    <aside class="flex h-full w-full max-w-[300px] flex-col overflow-y-auto bg-card p-5" @click.stop>
      <div class="mb-5 flex items-center justify-between">
        <span class="font-display text-base font-bold text-ink">Настройки</span>
        <button type="button" class="rounded-full p-1.5 text-ink-soft hover:bg-paper" @click="open = false">
          <X :size="16" />
        </button>
      </div>

      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Тема</div>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-[12.5px] font-semibold"
            :class="prefs.theme === 'light' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft'"
            @click="setTheme('light')"
          >
            <Sun :size="14" /> Светлая
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-[12.5px] font-semibold"
            :class="prefs.theme === 'dark' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft'"
            @click="setTheme('dark')"
          >
            <Moon :size="14" /> Тёмная
          </button>
        </div>
      </div>

      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Цвет темы</div>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="key in ACCENT_ORDER"
            :key="key"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full"
            :style="{ backgroundColor: ACCENTS[key][600] }"
            :title="key"
            @click="setAccent(key)"
          >
            <Check v-if="prefs.accent === key" :size="15" class="text-white" />
          </button>
        </div>
      </div>

      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Боковая панель</div>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border py-2 text-[12.5px] font-semibold"
            :class="prefs.sidebar === 'full' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft'"
            @click="setSidebar('full')"
          >
            Полная
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border py-2 text-[12.5px] font-semibold"
            :class="prefs.sidebar === 'collapse' ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-soft'"
            @click="setSidebar('collapse')"
          >
            Свёрнутая
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>
