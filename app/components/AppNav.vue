<script setup lang="ts">
import { LogOut } from '@lucide/vue'

const route = useRoute()
const auth = useAuthStore()
const isManager = computed(() => auth.hasRole('sales-manager') || auth.hasRole('developer-admin'))

interface NavItem {
  to: string
  label: string
  managerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Главная' },
  { to: '/deals', label: 'Воронка сделок', managerOnly: true },
  { to: '/clients', label: 'Клиенты' },
  { to: '/contracts', label: 'Договоры', managerOnly: true },
  { to: '/imports/units', label: 'Импорт из Excel', managerOnly: true },
  { to: '/settings/telegram', label: 'Telegram', managerOnly: true },
]

// Every page under a given section (e.g. /clients/42) should still
// highlight that section's nav item, not just an exact path match.
function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="border-b border-line bg-card px-6 py-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <nav class="flex flex-wrap items-center gap-1">
        <template v-for="item in NAV_ITEMS" :key="item.to">
          <NuxtLink
            v-if="!item.managerOnly || isManager"
            :to="item.to"
            class="rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            :class="isActive(item.to) ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-paper'"
          >
            {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="flex items-center gap-3">
        <span class="text-[12px] text-ink-soft">{{ auth.user?.name }}</span>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper"
          @click="auth.logout().then(() => navigateTo('/login'))"
        >
          <LogOut :size="14" /> Выйти
        </button>
      </div>
    </div>
  </div>
</template>
