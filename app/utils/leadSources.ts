import { Globe, Home, MessageCircle, Phone } from '@lucide/vue'

export type LeadSource = 'site' | 'call' | 'visit' | 'telegram'

export const LEAD_SOURCES: LeadSource[] = ['site', 'call', 'visit', 'telegram']

export const SOURCE_LABEL: Record<LeadSource, string> = {
  site: 'Сайт ihona.tj',
  call: 'Звонок',
  visit: 'Визит',
  telegram: 'Telegram',
}

export const SOURCE_ICON: Record<LeadSource, typeof Globe> = {
  site: Globe,
  call: Phone,
  visit: Home,
  telegram: MessageCircle,
}

// Tailwind can't see a color built from a variable at runtime (see
// utils/statusStyles.ts's own comment on the same trap) — these are
// complete literal class names per source, not string-built ones.
export const SOURCE_TEXT: Record<LeadSource, string> = {
  site: 'text-brand-600',
  call: 'text-sky-600',
  visit: 'text-amber-700',
  telegram: 'text-cyan-600',
}

export const SOURCE_BG: Record<LeadSource, string> = {
  site: 'bg-brand-50',
  call: 'bg-sky-50',
  visit: 'bg-amber-50',
  telegram: 'bg-cyan-50',
}

export function sourceLabel(source: string | null): string {
  return source && source in SOURCE_LABEL ? SOURCE_LABEL[source as LeadSource] : source ?? 'Неизвестно';
}
