/**
 * Business details for Lush Nail Salon & Spa.
 * Everything customer-facing about the branches is read from here — edit this file, not the components.
 */
import type { Localized } from '../i18n/types'

export type BranchId = 'new-cairo' | 'heliopolis'

export interface Branch {
  id: BranchId
  name: Localized
  /** Short location hint used on buttons and in the request summary. */
  area: Localized
  addressLines: Localized<string[]>
  /** Local format, as printed on the menu. Displayed left-to-right in both languages. */
  phoneDisplay: string
  /** E.164 format used for tel: links. */
  phoneE164: string
  mapUrl: string
  /**
   * WhatsApp is configured per branch and stays off until the owner confirms which number is
   * WhatsApp-enabled. Set to e.g. { e164: '+2010…' } once verified; the request flow then offers
   * a prefilled WhatsApp message for that branch. Never copy the phone number here without checking.
   */
  whatsapp: { e164: string } | null
}

export const branches: readonly Branch[] = [
  {
    id: 'new-cairo',
    name: { en: 'New Cairo', ar: 'القاهرة الجديدة' },
    area: { en: 'Midtown Mall', ar: 'ميدتاون مول' },
    addressLines: {
      en: ['Midtown Mall, second floor', 'Opposite AUC Gate 4, Fifth Settlement'],
      ar: ['ميدتاون مول، الدور التاني', 'أمام بوابة 4 الجامعة الأمريكية، التجمع الخامس'],
    },
    phoneDisplay: '010 6420 5204',
    phoneE164: '+201064205204',
    mapUrl: 'https://share.google/2i9ywsEqEBSprMnFR',
    whatsapp: null,
  },
  {
    id: 'heliopolis',
    name: { en: 'Heliopolis', ar: 'مصر الجديدة' },
    area: { en: 'Omar Ibn El Khattab St.', ar: 'شارع عمر ابن الخطاب' },
    addressLines: {
      en: ['118 Omar Ibn El Khattab Street', 'Heliopolis, Cairo'],
      ar: ['118 شارع عمر ابن الخطاب', 'مصر الجديدة، القاهرة'],
    },
    phoneDisplay: '010 3311 5133',
    phoneE164: '+201033115133',
    mapUrl: 'https://share.google/jjMSd7ndVvkRPeHfl',
    whatsapp: null,
  },
]

export const site = {
  name: 'Lush Nail Salon & Spa',
  instagram: {
    handle: 'lushnailsalonspa',
    url: 'https://www.instagram.com/lushnailsalonspa/',
    /** Opens a direct message thread with the account. */
    messageUrl: 'https://ig.me/m/lushnailsalonspa',
  },
  /** The official price list the menu on this site was transcribed from (last updated May 2026). */
  priceListUrl: 'https://drive.google.com/file/d/1KbPrcYD4-cQhg-XCMTQ9drVSRL204BWs/view',
  /** IANA zone used for every date and time in the request flow. */
  timeZone: 'Africa/Cairo',
} as const

export function getBranch(id: BranchId | null | undefined): Branch | undefined {
  return branches.find((b) => b.id === id)
}
