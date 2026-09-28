/**
 * "Our work" gallery.
 *
 * Until Lush supplies its own photographs, each look renders as an illustrated style plate
 * (see components/art/NailPlate.tsx). To use a real photo, add a `photo` entry — the gallery,
 * look viewer and appointment reference all pick it up automatically.
 */
import type { Localized } from '../i18n/types'
import type { Photo } from './media'

export type Finish = 'nude' | 'french' | 'chrome' | 'cateye' | 'ombre' | 'art' | 'red' | 'milky' | 'gilded'
export type NailShape = 'almond' | 'oval' | 'square' | 'coffin'

export interface Look {
  /** Short reference carried into the appointment request so the branch knows which look was chosen. */
  ref: string
  name: Localized
  description: Localized
  finish: Finish
  shape: NailShape
  /** Menu items this look relates to. The first one is preselected when a visitor enquires. */
  serviceIds: string[]
  /** Grid footprint on large screens. */
  size: 'large' | 'tall' | 'wide' | 'regular'
  photo?: Photo
}

export const looks: readonly Look[] = [
  {
    ref: 'LK-01',
    name: { en: 'Glossy nude', ar: 'نيود لامع' },
    description: {
      en: 'A sheer, polished nude on almond nails. Quiet enough for every day.',
      ar: 'لون نيود شفاف ولامع على ضفر ألموند. هادي ويليق على كل يوم.',
    },
    finish: 'nude',
    shape: 'almond',
    serviceIds: ['gel-x', 'evo-gel-polish', 'basic-manicure'],
    size: 'large',
  },
  {
    ref: 'LK-02',
    name: { en: 'Soft French', ar: 'فرنش ناعم' },
    description: {
      en: 'A fine white tip over a blush base.',
      ar: 'طرف أبيض رفيع على قاعدة بلاش.',
    },
    finish: 'french',
    shape: 'almond',
    serviceIds: ['french-design'],
    size: 'tall',
  },
  {
    ref: 'LK-03',
    name: { en: 'Pearl chrome', ar: 'كروم لؤلؤي' },
    description: {
      en: 'A glazed, pearly chrome that catches the light.',
      ar: 'كروم لؤلؤي لامع بيعكس النور.',
    },
    finish: 'chrome',
    shape: 'oval',
    serviceIds: ['chrome-finish'],
    size: 'regular',
  },
  {
    ref: 'LK-04',
    name: { en: 'Cat-eye plum', ar: 'كات آي بلون البرقوق' },
    description: {
      en: 'Deep plum with a shimmering band that moves as you do.',
      ar: 'لون برقوقي غامق بخط لامع بيتحرك مع حركة إيدك.',
    },
    finish: 'cateye',
    shape: 'coffin',
    serviceIds: ['cateye-design'],
    size: 'regular',
  },
  {
    ref: 'LK-05',
    name: { en: 'Baby ombré', ar: 'أومبريه بيبي' },
    description: {
      en: 'Nude fading softly into milky white.',
      ar: 'نيود بيتدرج بنعومة للأبيض الحليبي.',
    },
    finish: 'ombre',
    shape: 'almond',
    serviceIds: ['ombre-design'],
    size: 'wide',
  },
  {
    ref: 'LK-06',
    name: { en: 'Painted blossoms', ar: 'ورد مرسوم' },
    description: {
      en: 'Tiny hand-painted flowers on one or two accent nails.',
      ar: 'ورد صغير مرسوم باليد على ضفر أو اتنين.',
    },
    finish: 'art',
    shape: 'oval',
    serviceIds: ['nail-art'],
    size: 'regular',
  },
  {
    ref: 'LK-07',
    name: { en: 'Classic red', ar: 'أحمر كلاسيك' },
    description: {
      en: 'A glossy, true red on short, rounded nails.',
      ar: 'أحمر صريح ولامع على ضفر قصير مدوّر.',
    },
    finish: 'red',
    shape: 'square',
    serviceIds: ['basic-manicure', 'gel-polish-change'],
    size: 'tall',
  },
  {
    ref: 'LK-08',
    name: { en: 'Gilded French', ar: 'فرنش بلمسة دهبي' },
    description: {
      en: 'A French tip traced with a fine gold line.',
      ar: 'فرنش بخط دهبي رفيع على الحافة.',
    },
    finish: 'gilded',
    shape: 'almond',
    serviceIds: ['french-design', 'nail-art'],
    size: 'regular',
  },
  {
    ref: 'LK-09',
    name: { en: 'Milky pink', ar: 'بينك حليبي' },
    description: {
      en: 'An opaque, soft pink with a clean finish.',
      ar: 'بينك ناعم وكامل التغطية بلمسة نضيفة.',
    },
    finish: 'milky',
    shape: 'oval',
    serviceIds: ['gel-x', 'evo-gel-polish'],
    size: 'wide',
  },
]

export function findLook(ref: string | null | undefined) {
  return looks.find((l) => l.ref === ref)
}
