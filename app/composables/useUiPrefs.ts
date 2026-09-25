export type AccentKey = 'emerald' | 'blue' | 'violet' | 'teal' | 'orange'

interface AccentRamp {
  50: string
  100: string
  600: string
  700: string
  dark: string
}

// One ramp per swatch in the settings drawer — same five shades every
// component actually uses (checked via grep across app/): 50, 100, 600,
// 700, dark. Everything else (200-500, 800-900) stays the emerald default
// since nothing renders them directly.
export const ACCENTS: Record<AccentKey, AccentRamp> = {
  emerald: { 50: '#eef9f4', 100: '#d4efe4', 600: '#2e7d5c', 700: '#246349', dark: '#1c4a38' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 600: '#2563eb', 700: '#1d4ed8', dark: '#1e3a8a' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 600: '#7c3aed', 700: '#6d28d9', dark: '#4c1d95' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 600: '#0d9488', 700: '#0f766e', dark: '#134e4a' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 600: '#ea580c', 700: '#c2410c', dark: '#7c2d12' },
}

export type ThemeMode = 'light' | 'dark'
export type SidebarMode = 'full' | 'collapse'

interface UiPrefs {
  theme: ThemeMode
  accent: AccentKey
  sidebar: SidebarMode
}

const STORAGE_KEY = 'ihona_ui_prefs'

function applyPrefs(prefs: UiPrefs) {
  if (!import.meta.client) {
    return
  }
  const root = document.documentElement
  root.classList.toggle('dark', prefs.theme === 'dark')

  const ramp = ACCENTS[prefs.accent]
  root.style.setProperty('--color-brand-50', ramp[50])
  root.style.setProperty('--color-brand-100', ramp[100])
  root.style.setProperty('--color-brand-600', ramp[600])
  root.style.setProperty('--color-brand-700', ramp[700])
  root.style.setProperty('--color-brand-dark', ramp.dark)
}

/** Per-browser personalization (theme/accent/sidebar), same shape as the
 * Spike Admin reference's settings drawer the user asked to match —
 * stored in localStorage, never sent to the API: this is each agent's own
 * device preference, not team data. */
export function useUiPrefs() {
  const state = useState<UiPrefs>('ui-prefs', () => ({ theme: 'light', accent: 'emerald', sidebar: 'full' }))

  function load() {
    if (!import.meta.client) {
      return
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        state.value = { ...state.value, ...JSON.parse(raw) }
      }
    } catch {
      // Corrupt or blocked storage — fall back to defaults silently.
    }
    applyPrefs(state.value)
  }

  function save() {
    if (!import.meta.client) {
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // Private mode / quota — the preference still applies for this
      // session via reactive state, just won't persist across reloads.
    }
    applyPrefs(state.value)
  }

  function setTheme(theme: ThemeMode) {
    state.value.theme = theme
    save()
  }
  function setAccent(accent: AccentKey) {
    state.value.accent = accent
    save()
  }
  function setSidebar(sidebar: SidebarMode) {
    state.value.sidebar = sidebar
    save()
  }

  return { prefs: state, load, setTheme, setAccent, setSidebar }
}
