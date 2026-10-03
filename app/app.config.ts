export default defineAppConfig({
  ui: {
    colors: {
      // 'brand' is our own Tailwind color scale (app/assets/css/main.css's
      // @theme block, --color-brand-50..900, the Изумруд #2E7D5C ramp) —
      // not a stock Nuxt UI color name.
      primary: 'brand',
      neutral: 'slate',
    },
  },
})
