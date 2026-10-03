<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const { prefs, setTheme } = useUiPrefs()

async function logout() {
  await auth.logout()
  navigateTo('/login')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: auth.user?.name ?? '—' }],
  [
    {
      label: 'Тема',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Светлая',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: prefs.theme === 'light',
          onSelect: (e: Event) => {
            e.preventDefault()
            setTheme('light')
          },
        },
        {
          label: 'Тёмная',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: prefs.theme === 'dark',
          onSelect: (e: Event) => {
            e.preventDefault()
            setTheme('dark')
          },
        },
      ],
    },
  ],
  [{ label: 'Выйти', icon: 'i-lucide-log-out', onSelect: logout }],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
    >
      <template #leading>
        <AgentAvatar :name="auth.user?.name ?? '—'" :size="20" />
      </template>
      <span v-if="!collapsed" class="truncate">{{ auth.user?.name }}</span>
    </UButton>
  </UDropdownMenu>
</template>
