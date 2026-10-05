import tailwindcss from '@tailwindcss/vite'
import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // Served at crm.ihona.tj/agent, not its own subdomain — one fewer domain
  // to keep straight, and same-origin with the API it calls (so no CORS
  // needed at all, unlike the separate-subdomain plan this replaced).
  app: {
    baseURL: '/agent/',
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  // NOT extending ihona-frontend as a Nuxt layer: tried it, and Nuxt has no
  // way to inherit only assets/config while excluding a layer's pages/
  // directory — the storefront's own routes (e.g. /properties) leaked
  // straight into this app's routing. Brand tokens are copied into this
  // app's own assets/css/main.css instead (see the comment there); this
  // stays a genuinely separate app, matching the whole reason for a
  // separate repo in the first place.
  // Mid-migration from @nuxt/ui to Vuetify (app/plugins/vuetify.ts) — both
  // run side by side so pages not yet converted keep working on Nuxt UI
  // while newly-rebuilt pages use Vuetify. @nuxt/ui comes out once every
  // page is converted.
  modules: ['@pinia/nuxt', '@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    plugins: [tailwindcss(), vuetify({ autoImport: true })],
    vue: {
      template: {
        transformAssetUrls: {},
      },
    },
  },

  runtimeConfig: {
    public: {
      // Relative by default: same origin as this app now (crm.ihona.tj
      // serves both /agent, this app, and /api) — no host/scheme needed,
      // and no CORS config to keep in sync on the backend either. Override
      // with a full URL only for local dev against the deployed API.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      reverbAppKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY || '',
      reverbHost: process.env.NUXT_PUBLIC_REVERB_HOST || 'crm.ihona.tj',
      reverbPort: Number(process.env.NUXT_PUBLIC_REVERB_PORT || 443),
      reverbScheme: process.env.NUXT_PUBLIC_REVERB_SCHEME || 'https',
      // ihona-crm has no Filament panel at /app (only /admin), so Reverb's
      // default path works unmodified there — unlike the main ihona.tj
      // host, which needed /reverb to avoid colliding with its /app panel.
      reverbPath: process.env.NUXT_PUBLIC_REVERB_PATH || '/app',
    },
  },
})
