<script setup lang="ts">
import { ACCENTS } from '~/composables/useUiPrefs'
import type { AccentKey } from '~/composables/useUiPrefs'

const { prefs, load, setTheme, setAccent, setSidebar } = useUiPrefs()
const open = ref(false)

onMounted(load)

const ACCENT_ORDER: AccentKey[] = ['emerald', 'blue', 'violet', 'teal', 'orange']
</script>

<template>
  <!-- Floating gear, same corner as the Spike Admin reference's
       customizer panel — each agent's own device preference, not team
       data. -->
  <UButton
    icon="i-lucide-settings"
    size="lg"
    class="fixed bottom-20 right-4 z-40 h-11 w-11 justify-center rounded-full shadow-xl sm:bottom-5 sm:right-5"
    title="Настройки интерфейса"
    @click="open = true"
  />

  <USlideover v-model:open="open" title="Настройки" :ui="{ content: 'max-w-[300px]' }">
    <template #body>
      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Тема</div>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-sun"
            :color="prefs.theme === 'light' ? 'primary' : 'neutral'"
            :variant="prefs.theme === 'light' ? 'subtle' : 'outline'"
            class="flex-1 justify-center"
            @click="setTheme('light')"
          >
            Светлая
          </UButton>
          <UButton
            icon="i-lucide-moon"
            :color="prefs.theme === 'dark' ? 'primary' : 'neutral'"
            :variant="prefs.theme === 'dark' ? 'subtle' : 'outline'"
            class="flex-1 justify-center"
            @click="setTheme('dark')"
          >
            Тёмная
          </UButton>
        </div>
      </div>

      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Цвет темы</div>
        <div class="grid grid-cols-5 gap-2">
          <UButton
            v-for="key in ACCENT_ORDER"
            :key="key"
            square
            class="h-9 w-9 rounded-full"
            :style="{ backgroundColor: ACCENTS[key][600] }"
            :title="key"
            :icon="prefs.accent === key ? 'i-lucide-check' : undefined"
            @click="setAccent(key)"
          />
        </div>
      </div>

      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Боковая панель</div>
        <div class="flex gap-2">
          <UButton
            :color="prefs.sidebar === 'full' ? 'primary' : 'neutral'"
            :variant="prefs.sidebar === 'full' ? 'subtle' : 'outline'"
            class="flex-1 justify-center"
            @click="setSidebar('full')"
          >
            Полная
          </UButton>
          <UButton
            :color="prefs.sidebar === 'collapse' ? 'primary' : 'neutral'"
            :variant="prefs.sidebar === 'collapse' ? 'subtle' : 'outline'"
            class="flex-1 justify-center"
            @click="setSidebar('collapse')"
          >
            Свёрнутая
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
