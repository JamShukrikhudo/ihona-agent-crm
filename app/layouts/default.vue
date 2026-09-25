<template>
  <div class="flex min-h-screen">
    <AppNav />
    <div class="min-w-0 flex-1 pb-16 sm:pb-0">
      <slot />
    </div>
    <SettingsDrawer />
  </div>
</template>
