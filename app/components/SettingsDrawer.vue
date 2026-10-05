<script setup lang="ts">
import { useTheme } from 'vuetify'
import { ACCENTS } from '~/composables/useUiPrefs'
import type { AccentKey } from '~/composables/useUiPrefs'

const { prefs, load, setTheme, setAccent, setSidebar } = useUiPrefs()
const open = ref(false)
const vuetifyTheme = useTheme()

onMounted(load)
watch(() => prefs.theme, (theme) => {
  vuetifyTheme.global.name.value = theme === 'dark' ? 'ihonaDark' : 'ihonaLight'
}, { immediate: true })

const ACCENT_ORDER: AccentKey[] = ['emerald', 'blue', 'violet', 'teal', 'orange']
</script>

<template>
  <!-- Floating gear, same corner as the Spike Admin reference's
       customizer panel — each agent's own device preference, not team
       data. -->
  <VBtn
    icon="mdi-cog-outline"
    color="primary"
    size="large"
    class="fixed bottom-20 right-4 z-40 rounded-circle shadow-xl sm:bottom-5 sm:right-5"
    title="Настройки интерфейса"
    @click="open = true"
  />

  <VNavigationDrawer v-model="open" location="end" temporary width="300">
    <div class="pa-4">
      <div class="mb-4 font-display text-base font-bold">Настройки</div>

      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-medium-emphasis">Тема</div>
        <div class="flex gap-2">
          <VBtn
            prepend-icon="mdi-white-balance-sunny"
            :color="prefs.theme === 'light' ? 'primary' : 'default'"
            :variant="prefs.theme === 'light' ? 'tonal' : 'outlined'"
            class="flex-1"
            @click="setTheme('light')"
          >
            Светлая
          </VBtn>
          <VBtn
            prepend-icon="mdi-weather-night"
            :color="prefs.theme === 'dark' ? 'primary' : 'default'"
            :variant="prefs.theme === 'dark' ? 'tonal' : 'outlined'"
            class="flex-1"
            @click="setTheme('dark')"
          >
            Тёмная
          </VBtn>
        </div>
      </div>

      <div class="mb-5">
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-medium-emphasis">Цвет темы</div>
        <div class="grid grid-cols-5 gap-2">
          <VBtn
            v-for="key in ACCENT_ORDER"
            :key="key"
            icon
            size="small"
            :style="{ backgroundColor: ACCENTS[key][600] }"
            :title="key"
            @click="setAccent(key)"
          >
            <VIcon v-if="prefs.accent === key" icon="mdi-check" color="white" size="16" />
          </VBtn>
        </div>
      </div>

      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-medium-emphasis">Боковая панель</div>
        <div class="flex gap-2">
          <VBtn
            :color="prefs.sidebar === 'full' ? 'primary' : 'default'"
            :variant="prefs.sidebar === 'full' ? 'tonal' : 'outlined'"
            class="flex-1"
            @click="setSidebar('full')"
          >
            Полная
          </VBtn>
          <VBtn
            :color="prefs.sidebar === 'collapse' ? 'primary' : 'default'"
            :variant="prefs.sidebar === 'collapse' ? 'tonal' : 'outlined'"
            class="flex-1"
            @click="setSidebar('collapse')"
          >
            Свёрнутая
          </VBtn>
        </div>
      </div>
    </div>
  </VNavigationDrawer>
</template>
