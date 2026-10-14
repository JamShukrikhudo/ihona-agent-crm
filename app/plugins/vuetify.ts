import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

// Same Изумруд #2E7D5C brand ramp as the Tailwind @theme tokens in
// assets/css/main.css — Vuetify gets its own copy since its theme system
// doesn't read CSS custom properties, it needs literal hex values here.
const BRAND = {
  50: '#eef9f4',
  100: '#d4efe4',
  500: '#37956e',
  600: '#2e7d5c',
  700: '#246349',
  800: '#1c4c38',
  dark: '#1c4a38',
}

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    ssr: true,
    icons: {
      defaultSet: 'mdi',
    },
    theme: {
      defaultTheme: 'ihonaLight',
      themes: {
        ihonaLight: {
          dark: false,
          colors: {
            primary: BRAND[600],
            secondary: BRAND[700],
            background: '#f6f7f6',
            surface: '#ffffff',
            error: '#dc2626',
            success: '#2e7d5c',
            warning: '#b45309',
            info: '#0284c7',
          },
        },
        ihonaDark: {
          dark: true,
          colors: {
            primary: BRAND[500],
            secondary: BRAND[700],
            background: '#0f1512',
            surface: '#161d19',
            error: '#f87171',
            success: '#43b786',
            warning: '#fbbf24',
            info: '#38bdf8',
          },
        },
      },
    },
    defaults: {
      VBtn: { rounded: 'lg' },
      VCard: { rounded: 'lg', elevation: 1 },
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' },
      VTextarea: { variant: 'outlined', density: 'comfortable' },
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
