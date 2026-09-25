<script setup lang="ts">
import {
  CalendarDays,
  FileSignature,
  Home,
  KanbanSquare,
  LogOut,
  Send,
  Settings,
  Sheet,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
} from '@lucide/vue'

const route = useRoute()
const auth = useAuthStore()
const isManager = computed(() => auth.hasRole('sales-manager') || auth.hasRole('developer-admin'))
const isIhonaStaff = computed(() => auth.hasRole('ihona-staff'))

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  managerOnly?: boolean
  staffOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/deals', label: 'Воронка сделок', icon: KanbanSquare, managerOnly: true },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays, managerOnly: true },
  { to: '/clients', label: 'Клиенты', icon: Users },
  { to: '/contracts', label: 'Договоры', icon: FileSignature, managerOnly: true },
  { to: '/imports/units', label: 'Импорт из Excel', icon: Sheet, managerOnly: true },
  { to: '/settings/telegram', label: 'Telegram', icon: Send, managerOnly: true },
  { to: '/admin/teams', label: 'Команды', icon: UsersRound, staffOnly: true },
  { to: '/admin/users', label: 'Пользователи', icon: UserCog, staffOnly: true },
  { to: '/admin/roles', label: 'Роли', icon: ShieldCheck, staffOnly: true },
]

const visibleItems = computed(() =>
  NAV_ITEMS.filter((item) => (!item.managerOnly || isManager.value) && (!item.staffOnly || isIhonaStaff.value)),
)

// Every page under a given section (e.g. /clients/42) should still
// highlight that section's nav item, not just an exact path match.
function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <!-- Bare icon rail, flyout with full labels on hover — same pattern as
       the approved design prototype's sidebar, just in this app's own
       brand color rather than the prototype's blue. -->
  <div class="group/nav relative z-30 h-screen shrink-0" style="width: 72px">
    <div class="flex h-full w-[72px] flex-col items-center border-r border-line bg-card py-5">
      <div class="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-[15px] font-extrabold text-white">
        i
      </div>

      <nav class="flex flex-1 flex-col items-center gap-1.5">
        <NuxtLink
          v-for="item in visibleItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          class="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
          :class="isActive(item.to) ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-paper'"
        >
          <component :is="item.icon" :size="19" />
        </NuxtLink>
      </nav>

      <div class="mt-auto flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft/50">
        <Settings :size="19" />
      </div>
    </div>

    <!-- Flyout: appears on hover over the rail, full labels + account footer -->
    <div
      class="invisible absolute left-[72px] top-0 flex h-full w-[210px] -translate-x-1.5 flex-col rounded-r-2xl border border-line bg-card p-4 opacity-0 shadow-xl transition-all duration-150 group-hover/nav:visible group-hover/nav:translate-x-0 group-hover/nav:opacity-100"
    >
      <div class="mb-5 flex items-center gap-2.5 px-1">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-[13px] font-extrabold text-white">
          i
        </div>
        <span class="font-display text-[15px] font-extrabold text-ink">ihona CRM</span>
      </div>

      <nav class="flex flex-1 flex-col gap-0.5">
        <NuxtLink
          v-for="item in visibleItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold"
          :class="isActive(item.to) ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-paper'"
        >
          <component :is="item.icon" :size="17" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="mt-2 flex items-center gap-2.5 rounded-xl bg-paper p-2.5">
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12px] font-semibold text-ink">{{ auth.user?.name }}</div>
        </div>
        <button
          type="button"
          title="Выйти"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-card"
          @click="auth.logout().then(() => navigateTo('/login'))"
        >
          <LogOut :size="15" />
        </button>
      </div>
    </div>
  </div>
</template>
