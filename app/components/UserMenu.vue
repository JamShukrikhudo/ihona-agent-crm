<script setup lang="ts">
import { useTheme } from 'vuetify'

defineProps<{ inline?: boolean }>()

const auth = useAuthStore()
const { prefs, setTheme } = useUiPrefs()
const vuetifyTheme = useTheme()

// Spike-style topbar user block shows a role label under the name — map
// our role slugs to the same labels used elsewhere (admin/teams, nav gates).
const ROLE_LABEL: Record<string, string> = {
  'developer-admin': 'Администратор',
  'sales-manager': 'Менеджер продаж',
  'ihona-staff': 'Сотрудник ihona',
}
const roleLabel = computed(() => {
  const role = auth.user?.roles.find((r) => r in ROLE_LABEL)
  return role ? ROLE_LABEL[role] : 'Агент'
})

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
  <div :class="inline ? '' : 'px-2 py-2'">
    <VMenu location="bottom end" :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <VBtn v-if="inline" variant="text" color="default" class="h-auto px-2 py-1" v-bind="menuProps">
          <AgentAvatar :name="auth.user?.name ?? '—'" :size="32" />
          <div class="ml-2 flex flex-col items-start leading-tight">
            <span class="text-[13px] font-semibold">{{ auth.user?.name }}</span>
            <span class="text-[11px] text-medium-emphasis">{{ roleLabel }}</span>
          </div>
        </VBtn>
        <VBtn v-else variant="text" color="default" block class="justify-start" v-bind="menuProps">
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
