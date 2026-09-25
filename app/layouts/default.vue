<template>
  <div class="flex min-h-screen">
    <AppNav />
    <div class="min-w-0 flex-1">
      <slot />
    </div>
    <SettingsDrawer />
  </div>
</template>
