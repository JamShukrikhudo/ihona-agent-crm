import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // NOT extending ihona-frontend as a Nuxt layer: tried it, and Nuxt has no
  // way to inherit only assets/config while excluding a layer's pages/
  // directory — the storefront's own routes (e.g. /properties) leaked
  // straight into this app's routing. Brand tokens are copied into this
  // app's own assets/css/main.css instead (see the comment there); this
  // stays a genuinely separate app, matching the whole reason for a
  // separate repo in the first place.
  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://ihona.tj/api',
      reverbAppKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY || '',
      reverbHost: process.env.NUXT_PUBLIC_REVERB_HOST || 'ihona.tj',
      reverbPort: Number(process.env.NUXT_PUBLIC_REVERB_PORT || 443),
      reverbScheme: process.env.NUXT_PUBLIC_REVERB_SCHEME || 'https',
    },
  },
})
