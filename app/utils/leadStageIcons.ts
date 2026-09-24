import { CheckCircle2, Eye, HelpCircle, KeyRound, Phone, UserPlus, XCircle } from '@lucide/vue'
import type { LeadStage } from '~/stores/useLeadsStore'

/** Shared between DealsBoard's column headers and the dashboard's funnel
 * chart so the two never drift into different icon choices per stage. */
export const STAGE_ICON: Record<LeadStage, typeof UserPlus> = {
  new: UserPlus,
  needs_clarification: HelpCircle,
  contacted: Phone,
  viewing_scheduled: Eye,
  reserved: KeyRound,
  contracted: CheckCircle2,
  lost: XCircle,
}
