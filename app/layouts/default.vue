<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()
const isManager = computed(() => auth.hasRole('sales-manager') || auth.hasRole('developer-admin'))
const isIhonaStaff = computed(() => auth.hasRole('ihona-staff'))

interface NavEntry {
  to: string
  label: string
  icon: string
  managerOnly?: boolean
  staffOnly?: boolean
}
interface NavSection {
  label: string
  entries: NavEntry[]
}

// mdi-* icon names (Vuetify's default icon set) — same destinations as
// before, just a different icon font than the Iconify/lucide strings the
// Nuxt UI sidebar used.
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Основное',
    entries: [
      { to: '/', label: 'Главная', icon: 'mdi-home-outline' },
      { to: '/inbox', label: 'Входящие', icon: 'mdi-inbox-outline' },
    ],
  },
  {
    label: 'Продажи',
    entries: [
      { to: '/deals', label: 'Воронка сделок', icon: 'mdi-view-column-outline', managerOnly: true },
      { to: '/calendar', label: 'Календарь', icon: 'mdi-calendar-blank-outline', managerOnly: true },
      { to: '/planning', label: 'Планирование', icon: 'mdi-target', managerOnly: true },
      { to: '/clients', label: 'Клиенты', icon: 'mdi-account-group-outline' },
      { to: '/contracts', label: 'Договоры', icon: 'mdi-file-sign', managerOnly: true },
      { to: '/imports/units', label: 'Импорт из Excel', icon: 'mdi-file-table-outline', managerOnly: true },
    ],
  },
  {
    label: 'Каналы связи',
    entries: [
      { to: '/settings/telegram', label: 'Telegram', icon: 'mdi-send-outline', managerOnly: true },
      { to: '/settings/meta', label: 'WhatsApp / Instagram / Messenger', icon: 'mdi-camera-outline', managerOnly: true },
      { to: '/settings/broadcasts', label: 'Рассылки', icon: 'mdi-bullhorn-outline', managerOnly: true },
    ],
  },
]

const STAFF_ENTRIES: NavEntry[] = [
  { to: '/admin/teams', label: 'Команды', icon: 'mdi-account-multiple-outline' },
  { to: '/admin/users', label: 'Пользователи', icon: 'mdi-account-cog-outline' },
  { to: '/admin/roles', label: 'Роли', icon: 'mdi-shield-check-outline' },
]

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
function visible(entries: NavEntry[]): NavEntry[] {
  return entries.filter((e) => (!e.managerOnly || isManager.value) && (!e.staffOnly || isIhonaStaff.value))
}

const visibleSections = computed(() => NAV_SECTIONS.map((s) => ({ ...s, entries: visible(s.entries) })).filter((s) => s.entries.length))
const visibleStaffEntries = computed(() => (isIhonaStaff.value ? visible(STAFF_ENTRIES) : []))

const rail = ref(false)

const searchOpen = ref(false)
const searchGroups = computed(() => [
  ...visibleSections.value.map((s) => ({ id: s.label, label: s.label, items: s.entries.map((e) => ({ label: e.label, icon: e.icon, to: e.to })) })),
  ...(visibleStaffEntries.value.length
    ? [{ id: 'staff', label: 'Администрирование', items: visibleStaffEntries.value.map((e) => ({ label: e.label, icon: e.icon, to: e.to })) }]
    : []),
])
</script>

<template>
  <VApp>
    <VNavigationDrawer :rail="rail" permanent expand-on-hover color="surface" border="e">
      <VListItem class="py-3">
        <template #prepend>
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-[15px] font-extrabold text-white">
            i
          </div>
        </template>
        <VListItemTitle class="font-display text-[15px] font-extrabold">ihona CRM</VListItemTitle>
      </VListItem>

      <VDivider />

      <template v-for="section in visibleSections" :key="section.label">
        <VListSubheader>{{ section.label }}</VListSubheader>
        <VList density="compact" nav>
          <VListItem
            v-for="e in section.entries"
            :key="e.to"
            :to="e.to"
            :prepend-icon="e.icon"
            :title="e.label"
            :active="isActive(e.to)"
            color="primary"
            rounded="lg"
          />
        </VList>
      </template>

      <template v-if="visibleStaffEntries.length">
        <VListSubheader>Администрирование</VListSubheader>
        <VList density="compact" nav>
          <VListItem
            v-for="e in visibleStaffEntries"
            :key="e.to"
            :to="e.to"
            :prepend-icon="e.icon"
            :title="e.label"
            :active="isActive(e.to)"
            color="primary"
            rounded="lg"
          />
        </VList>
      </template>

      <template #append>
        <UserMenu />
      </template>
    </VNavigationDrawer>

    <VAppBar color="surface" elevation="0" border="b" density="comfortable">
      <VAppBarNavIcon @click="rail = !rail" />
      <VBtn
        variant="outlined"
        color="default"
        class="ml-2 justify-start text-medium-emphasis"
        style="width: 100%; max-width: 320px"
        prepend-icon="mdi-magnify"
        @click="searchOpen = true"
      >
        Поиск…
      </VBtn>
      <VSpacer />
      <UserMenu inline />
    </VAppBar>

    <VMain>
      <slot />
    </VMain>

    <UDashboardSearch v-model:open="searchOpen" :groups="searchGroups" />
    <SettingsDrawer />
  </VApp>
</template>
