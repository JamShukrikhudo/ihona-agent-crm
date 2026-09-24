import { Camera, Globe, Phone, Users } from '@lucide/vue'

// Matches the real values actually stored in `leads.source` in production
// (checked directly against the database) — an earlier version of this
// file listed 'site' | 'call' | 'visit' | 'telegram', none of which exist
// in the real data except 'site', so every lead card and the dashboard's
// source donut silently showed nothing for most leads.
export type LeadSource = 'phone' | 'referral' | 'site' | 'instagram'

export const LEAD_SOURCES: LeadSource[] = ['phone', 'referral', 'site', 'instagram']

export const SOURCE_LABEL: Record<LeadSource, string> = {
  phone: 'Звонок',
  referral: 'Рекомендация',
  site: 'Сайт ihona.tj',
  instagram: 'Instagram',
}

export const SOURCE_ICON: Record<LeadSource, typeof Globe> = {
  phone: Phone,
  referral: Users,
  site: Globe,
  // No dedicated Instagram glyph in this lucide-vue version — Camera is the
  // closest generic "photo/social" stand-in.
  instagram: Camera,
}

// Tailwind can't see a color built from a variable at runtime (see
// utils/statusStyles.ts's own comment on the same trap) — these are
// complete literal class names per source, not string-built ones.
export const SOURCE_TEXT: Record<LeadSource, string> = {
  phone: 'text-sky-600',
  referral: 'text-amber-700',
  site: 'text-brand-600',
  instagram: 'text-pink-600',
}

export const SOURCE_BG: Record<LeadSource, string> = {
  phone: 'bg-sky-50',
  referral: 'bg-amber-50',
  site: 'bg-brand-50',
  instagram: 'bg-pink-50',
}

export function sourceLabel(source: string | null): string {
  return source && source in SOURCE_LABEL ? SOURCE_LABEL[source as LeadSource] : source ?? 'Неизвестно'
}
