import type { UnitStatus } from '~/stores/useUnitsStore'

/**
 * Tailwind v4 only keeps a @theme color's generated CSS variable (and
 * therefore lets var(--color-status-X) resolve at all, even in a plain
 * inline style) when a utility class using that exact name appears as a
 * literal string somewhere in the scanned source — building the class
 * name via template-string interpolation (`bg-status-${status}` or
 * `var(--color-status-${status})`) doesn't count. That's exactly why the
 * "Задаток внесён"/"Продано" badges rendered with no color at all: free
 * and reserved happened to survive by accident (used as literal classes
 * elsewhere), deposit and sold never appeared literally anywhere and got
 * tree-shaken out of the compiled CSS entirely. These maps exist purely so
 * every status name appears as a complete literal string Tailwind's
 * scanner can find.
 */
export const STATUS_BG: Record<UnitStatus, string> = {
  free: 'bg-status-free',
  reserved: 'bg-status-reserved',
  deposit: 'bg-status-deposit',
  sold: 'bg-status-sold',
}

export const STATUS_BG_SOFT: Record<UnitStatus, string> = {
  free: 'bg-status-free-soft',
  reserved: 'bg-status-reserved-soft',
  deposit: 'bg-status-deposit-soft',
  sold: 'bg-status-sold-soft',
}

export const STATUS_BORDER: Record<UnitStatus, string> = {
  free: 'border-status-free',
  reserved: 'border-status-reserved',
  deposit: 'border-status-deposit',
  sold: 'border-status-sold',
}

export const STATUS_TEXT: Record<UnitStatus, string> = {
  free: 'text-status-free',
  reserved: 'text-status-reserved',
  deposit: 'text-status-deposit',
  sold: 'text-status-sold',
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  free: 'Свободно',
  reserved: 'В брони',
  deposit: 'Задаток внесён',
  sold: 'Продано',
}
