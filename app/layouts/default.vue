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
const NAV_ENTRIES: NavEntry[] = [
  { to: '/', label: 'Главная', icon: 'i-lucide-house' },
  { to: '/inbox', label: 'Входящие', icon: 'i-lucide-inbox' },
  { to: '/deals', label: 'Воронка сделок', icon: 'i-lucide-kanban-square', managerOnly: true },
  { to: '/calendar', label: 'Календарь', icon: 'i-lucide-calendar-days', managerOnly: true },
  { to: '/planning', label: 'Планирование', icon: 'i-lucide-target', managerOnly: true },
  { to: '/clients', label: 'Клиенты', icon: 'i-lucide-users' },
  { to: '/contracts', label: 'Договоры', icon: 'i-lucide-file-signature', managerOnly: true },
  { to: '/imports/units', label: 'Импорт из Excel', icon: 'i-lucide-sheet', managerOnly: true },
  { to: '/settings/telegram', label: 'Telegram', icon: 'i-lucide-send', managerOnly: true },
  { to: '/settings/meta', label: 'WhatsApp / Instagram', icon: 'i-lucide-camera', managerOnly: true },
  { to: '/settings/broadcasts', label: 'Рассылки', icon: 'i-lucide-megaphone', managerOnly: true },
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

const primaryItems = computed(() => toMenuItems(NAV_ENTRIES))
const staffItems = computed(() => (isIhonaStaff.value ? toMenuItems(STAFF_ENTRIES) : []))

async function logout() {
  await auth.logout()
  navigateTo('/login')
}
</script>

<template>
  <UDashboardGroup storage-key="ihona-crm-sidebar">
    <UDashboardSidebar collapsible resizable :min-size="14" :default-size="16" :max-size="22" :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-display text-[15px] font-extrabold text-white">
          i
        </div>
        <span v-if="!collapsed" class="font-display text-[15px] font-extrabold text-ink">ihona CRM</span>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="primaryItems" orientation="vertical" />
        <UNavigationMenu v-if="staffItems.length" :collapsed="collapsed" :items="staffItems" orientation="vertical" class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : auth.user?.name"
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          :block="!collapsed"
          :square="collapsed"
          @click="logout"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <slot />
    </UDashboardPanel>

    <SettingsDrawer />
  </UDashboardGroup>
</template>
