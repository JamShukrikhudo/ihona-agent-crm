<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

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

// Same destinations as before (icons now Iconify strings for
// UNavigationMenu instead of @lucide/vue components — the rest of the
// app still imports icons as components where it renders them directly).
// Grouped under section labels (Spike Admin's "HOME"/"APPS" pattern) so
// the sidebar reads as a map of the app instead of one long list.
interface NavSection {
  label: string
  entries: NavEntry[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Основное',
    entries: [
      { to: '/', label: 'Главная', icon: 'i-lucide-house' },
      { to: '/inbox', label: 'Входящие', icon: 'i-lucide-inbox' },
    ],
  },
  {
    label: 'Продажи',
    entries: [
      { to: '/deals', label: 'Воронка сделок', icon: 'i-lucide-kanban-square', managerOnly: true },
      { to: '/calendar', label: 'Календарь', icon: 'i-lucide-calendar-days', managerOnly: true },
      { to: '/planning', label: 'Планирование', icon: 'i-lucide-target', managerOnly: true },
      { to: '/clients', label: 'Клиенты', icon: 'i-lucide-users' },
      { to: '/contracts', label: 'Договоры', icon: 'i-lucide-file-signature', managerOnly: true },
      { to: '/imports/units', label: 'Импорт из Excel', icon: 'i-lucide-sheet', managerOnly: true },
    ],
  },
  {
    label: 'Каналы связи',
    entries: [
      { to: '/settings/telegram', label: 'Telegram', icon: 'i-lucide-send', managerOnly: true },
      { to: '/settings/meta', label: 'WhatsApp / Instagram', icon: 'i-lucide-camera', managerOnly: true },
      { to: '/settings/broadcasts', label: 'Рассылки', icon: 'i-lucide-megaphone', managerOnly: true },
    ],
  },
]

const STAFF_ENTRIES: NavEntry[] = [
  { to: '/admin/teams', label: 'Команды', icon: 'i-lucide-users-round' },
  { to: '/admin/users', label: 'Пользователи', icon: 'i-lucide-user-cog' },
  { to: '/admin/roles', label: 'Роли', icon: 'i-lucide-shield-check' },
]

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function toMenuItems(entries: NavEntry[]): NavigationMenuItem[] {
  return entries
    .filter((e) => (!e.managerOnly || isManager.value) && (!e.staffOnly || isIhonaStaff.value))
    .map((e) => ({ label: e.label, icon: e.icon, to: e.to, active: isActive(e.to) }))
}

const primaryItems = computed(() =>
  NAV_SECTIONS.flatMap((section): NavigationMenuItem[] => {
    const items = toMenuItems(section.entries)
    return items.length ? [{ label: section.label, type: 'label' as const }, ...items] : []
  }),
)
const staffItems = computed(() =>
  isIhonaStaff.value ? [{ label: 'Администрирование', type: 'label' as const }, ...toMenuItems(STAFF_ENTRIES)] : [],
)

// Cmd+K command palette — every real destination in the sidebar, grouped
// the same way, so it's a genuine "jump to page" tool rather than a
// decorative search box with nothing behind it.
const searchGroups = computed(() => [
  ...NAV_SECTIONS.map((section) => ({
    id: section.label,
    label: section.label,
    items: toMenuItems(section.entries).map((item) => ({ label: item.label as string, icon: item.icon as string, to: item.to as string })),
  })).filter((g) => g.items.length),
  ...(isIhonaStaff.value
    ? [{ id: 'staff', label: 'Администрирование', items: toMenuItems(STAFF_ENTRIES).map((item) => ({ label: item.label as string, icon: item.icon as string, to: item.to as string })) }]
    : []),
])

</script>

<template>
  <UDashboardGroup storage-key="ihona-crm-sidebar">
    <UDashboardSidebar collapsible resizable :min-size="14" :default-size="16" :max-size="22" class="bg-elevated/25" :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-display text-[15px] font-extrabold text-white">
          i
        </div>
        <span v-if="!collapsed" class="font-display text-[15px] font-extrabold text-ink">ihona CRM</span>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />
        <UNavigationMenu :collapsed="collapsed" :items="primaryItems" orientation="vertical" />
        <UNavigationMenu v-if="staffItems.length" :collapsed="collapsed" :items="staffItems" orientation="vertical" class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <UDashboardPanel :ui="{ body: 'p-0 sm:p-0 gap-0' }">
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <SettingsDrawer />
  </UDashboardGroup>
</template>
