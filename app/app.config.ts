export default defineAppConfig({
  ui: {
    colors: {
      // 'brand' is our own Tailwind color scale (app/assets/css/main.css's
      // @theme block, --color-brand-50..900, the Изумруд #2E7D5C ramp) —
      // not a stock Nuxt UI color name.
      primary: 'brand',
      neutral: 'slate',
    },
    // Softer, rounder "Spike Admin"-style surfaces: pill-shaped nav items
    // with roomier tap targets, and cards without a hard ring — a shadow
    // reads as "card" on its own, matching the reference's airy density.
    navigationMenu: {
      slots: {
        link: 'rounded-full px-3 py-2.5 gap-3',
        linkLeadingIcon: 'size-5',
        label: 'px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-dimmed',
      },
    },
    card: {
      slots: {
        root: 'rounded-2xl shadow-sm',
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-default ring-0 divide-y divide-default',
          },
        },
      },
    },
  },
})
