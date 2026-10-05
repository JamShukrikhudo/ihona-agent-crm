<script setup lang="ts">
import { useTheme } from 'vuetify'

const auth = useAuthStore()
const { prefs, setTheme } = useUiPrefs()
const vuetifyTheme = useTheme()

watch(
  () => prefs.theme,
  (theme) => {
    vuetifyTheme.global.name.value = theme === 'dark' ? 'ihonaDark' : 'ihonaLight'
  },
  { immediate: true },
)

async function logout() {
  await auth.logout()
  navigateTo('/login')
}
</script>

<template>
  <div class="px-2 py-2">
    <VMenu location="top" :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <VBtn variant="text" color="default" block class="justify-start" v-bind="menuProps">
          <template #prepend>
            <AgentAvatar :name="auth.user?.name ?? '—'" :size="24" />
          </template>
          <span class="truncate">{{ auth.user?.name }}</span>
          <template #append>
            <VIcon icon="mdi-unfold-more-horizontal" size="18" />
          </template>
        </VBtn>
      </template>

      <VList density="compact" min-width="220">
        <VListSubheader>{{ auth.user?.name }}</VListSubheader>
        <VDivider class="mb-1" />
        <VListItem title="Тема" subtitle="Светлая / тёмная">
          <template #append>
            <VBtnToggle :model-value="prefs.theme" mandatory density="compact" color="primary" @update:model-value="setTheme($event)">
              <VBtn value="light" icon="mdi-white-balance-sunny" size="x-small" />
              <VBtn value="dark" icon="mdi-weather-night" size="x-small" />
            </VBtnToggle>
          </template>
        </VListItem>
        <VDivider class="my-1" />
        <VListItem prepend-icon="mdi-logout" title="Выйти" @click="logout" />
      </VList>
    </VMenu>
  </div>
</template>
