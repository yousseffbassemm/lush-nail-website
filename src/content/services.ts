/**
 * The Lush service menu, transcribed from the official price list (Lush Price List.pdf, May 2026).
 * Prices are in Egyptian pounds (LE). Durations appear only where the price list prints them.
 * Service names follow the price list; groupings follow the website's five categories.
 */
import type { Localized } from '../i18n/types'

export type CategoryId = 'nails' | 'skin' | 'spa' | 'lashes' | 'bridal'

export type Price =
  | { kind: 'fixed'; amount: number }
  | { kind: 'range'; min: number; max: number; unit: 'perNail' }

export type Modifier =
  | { kind: 'withoutColour' }
  | { kind: 'withColour' }
  | { kind: 'addForColour'; amount: number }
  | { kind: 'note'; text: Localized }

export interface Service {
  id: string
  name: Localized
  price: Price
  modifiers?: Modifier[]
  /** What the price list says is included (Moroccan bath rituals, bridal packages). */
  includes?: Localized<string[]>
  /** Minutes, only when printed on the price list. */
  durationMin?: number
}

export interface MenuSection {
  id: string
  title: Localized
  note?: Localized
  /** Heading shown above a duration column, when the section lists durations. */
  showsDuration?: boolean
  services: Service[]
}

export interface Category {
  id: CategoryId
  title: Localized
  sections: MenuSection[]
}

const fixed = (amount: number): Price => ({ kind: 'fixed', amount })
const withoutColour: Modifier = { kind: 'withoutColour' }
const withColour: Modifier = { kind: 'withColour' }

export const categories: readonly Category[] = [
  {
    id: 'nails',
    title: { en: 'Nails', ar: 'الأظافر' },
    sections: [
      {
        id: 'enhancements',
        title: { en: 'Enhancements', ar: 'التركيبات والإكستنشن' },
        services: [
          { id: 'new-set-acrylic-hardgel', name: { en: 'New set acrylic / hard gel', ar: 'تركيب أكريليك / هارد جل جديد' }, price: fixed(800), modifiers: [withoutColour] },
          { id: 'acrylic-hardgel-form', name: { en: 'Acrylic / hard gel form', ar: 'أكريليك / هارد جل فورم' }, price: fixed(1500) },
          { id: 'refill-acrylic-hardgel', name: { en: 'Refill acrylic / hard gel', ar: 'رِفِل أكريليك / هارد جل' }, price: fixed(600), modifiers: [withoutColour] },
          { id: 'polygel-extension', name: { en: 'Polygel nail extension', ar: 'إكستنشن بولي جل' }, price: fixed(1100), modifiers: [withoutColour] },
          { id: 'breathable-gel-extensions', name: { en: 'Breathable gel polish extensions', ar: 'إكستنشن جل بوليش بريذابل' }, price: fixed(1400) },
          { id: 'gel-x', name: { en: 'Gel X', ar: 'جل إكس' }, price: fixed(1000), modifiers: [withColour] },
          { id: 'dipping-powder', name: { en: 'Dipping powder', ar: 'ديبينج باودر' }, price: fixed(600) },
          { id: 'evo-gel-polish', name: { en: 'EVO gel polish', ar: 'إيفو جل بوليش' }, price: fixed(600) },
          { id: 'gel-polish-change', name: { en: 'Gel polish change', ar: 'تغيير جل بوليش' }, price: fixed(500) },
          {
            id: 'artificial-nails',
            name: { en: 'Artificial nails', ar: 'أظافر صناعية' },
            price: fixed(500),
            modifiers: [{ kind: 'note', text: { en: 'Lasts one week', ar: 'بتستمر أسبوع' } }],
          },
          { id: 'acrylic-one-toe', name: { en: 'Acrylic, one toe', ar: 'أكريليك صباع رجل واحد' }, price: fixed(150) },
          { id: 'fixing-one-nail', name: { en: 'Fixing one nail', ar: 'تصليح ضفر واحد' }, price: fixed(50) },
          { id: 'extension-removal', name: { en: 'Acrylic or nail extension removal', ar: 'إزالة أكريليك أو إكستنشن' }, price: fixed(250) },
          { id: 'gel-removal', name: { en: 'Gel removal', ar: 'إزالة الجل' }, price: fixed(200) },
        ],
      },
      {
        id: 'nail-design',
        title: { en: 'Nail design', ar: 'تصميمات الأظافر' },
        services: [
          { id: 'french-design', name: { en: 'French design', ar: 'تصميم فرنش' }, price: fixed(150) },
          { id: 'ombre-design', name: { en: 'Ombré design', ar: 'تصميم أومبريه' }, price: fixed(150) },
          { id: 'chrome-finish', name: { en: 'Chrome finish', ar: 'لمسة كروم' }, price: fixed(150) },
          { id: 'cateye-design', name: { en: 'Cat-eye design', ar: 'تصميم كات آي' }, price: fixed(150) },
          { id: 'nail-art', name: { en: 'Nail art', ar: 'نيل آرت' }, price: { kind: 'range', min: 30, max: 60, unit: 'perNail' } },
        ],
      },
      {
        id: 'manicure-pedicure',
        title: { en: 'Manicure & pedicure', ar: 'مانيكير وباديكير' },
        services: [
          { id: 'basic-manicure', name: { en: 'Basic manicure', ar: 'مانيكير أساسي' }, price: fixed(225), modifiers: [{ kind: 'addForColour', amount: 100 }] },
          { id: 'basic-pedicure', name: { en: 'Basic pedicure', ar: 'باديكير أساسي' }, price: fixed(275), modifiers: [{ kind: 'addForColour', amount: 100 }] },
          { id: 'basic-manicure-pedicure', name: { en: 'Basic manicure & pedicure', ar: 'مانيكير وباديكير أساسي' }, price: fixed(600), modifiers: [withColour] },
          { id: 'paraffin-hand', name: { en: 'Hot paraffin wax, hands', ar: 'شمع بارافين ساخن لليدين' }, price: fixed(300) },
          { id: 'paraffin-foot', name: { en: 'Hot paraffin wax, feet', ar: 'شمع بارافين ساخن للقدمين' }, price: fixed(300) },
          { id: 'polish-change', name: { en: 'Polish change', ar: 'تغيير المناكير' }, price: fixed(150) },
          { id: 'callus-removal', name: { en: 'Callus removal', ar: 'إزالة الكالو' }, price: fixed(300) },
          { id: 'callus-removal-paraffin', name: { en: 'Callus removal + hot paraffin', ar: 'إزالة الكالو + بارافين ساخن' }, price: fixed(500) },
        ],
      },
    ],
  },
  {
    id: 'skin',
    title: { en: 'Skin', ar: 'البشرة' },
    sections: [
      {
        id: 'facials',
        title: { en: 'Facial treatments', ar: 'جلسات البشرة' },
        services: [
          { id: 'basic-facial', name: { en: 'Basic facial treatment', ar: 'تنظيف بشرة أساسي' }, price: fixed(1100) },
          { id: 'true-sculpting-acne-facial', name: { en: 'True sculpting / acne facial treatment', ar: 'جلسة True Sculpting / علاج حب الشباب' }, price: fixed(1400) },
          { id: 'glow-shine', name: { en: 'Glow and shine treatment', ar: 'جلسة نضارة ولمعان' }, price: fixed(1650) },
          { id: 'dermaplaning', name: { en: 'Dermaplaning', ar: 'ديرمابلانينج' }, price: fixed(500) },
          { id: 'back-facial', name: { en: 'Back facial', ar: 'تنظيف بشرة للظهر' }, price: fixed(1500) },
        ],
      },
      {
        id: 'mask-add-ons',
        title: { en: 'Mask add-ons', ar: 'إضافات الماسكات' },
        services: [
          { id: 'frosty-jelly-mask', name: { en: 'Frosty jelly face mask', ar: 'ماسك فروستي جيلي للوجه' }, price: fixed(375) },
          { id: 'golden-mask', name: { en: 'Golden face mask', ar: 'ماسك ذهبي للوجه' }, price: fixed(180) },
          { id: 'whitening-mask', name: { en: 'Whitening face mask', ar: 'ماسك تفتيح للوجه' }, price: fixed(100) },
          { id: 'dead-sea-mask', name: { en: 'Dead Sea face mask', ar: 'ماسك البحر الميت للوجه' }, price: fixed(150) },
          { id: 'blackhead-peel', name: { en: 'Peeling off blackheads', ar: 'إزالة الرؤوس السوداء' }, price: fixed(150) },
          { id: 'termes-body-mask', name: { en: 'Termes body mask', ar: 'ماسك الترمس للجسم' }, price: fixed(150) },
        ],
      },
    ],
  },
  {
    id: 'spa',
    title: { en: 'Spa & Body', ar: 'السبا والجسم' },
    sections: [
      {
        id: 'moroccan-bath',
        title: { en: 'Moroccan bath', ar: 'الحمام المغربي' },
        services: [
          {
            id: 'moroccan-bath-jacuzzi',
            name: { en: 'Moroccan bath & Jacuzzi', ar: 'حمام مغربي وجاكوزي' },
            price: fixed(1200),
            includes: {
              en: ['Steam', 'Moroccan soap', 'Moroccan mud & scrubbing'],
              ar: ['بخار', 'صابون مغربي', 'طين مغربي وتقشير'],
            },
          },
          {
            id: 'moroccan-treat-jacuzzi',
            name: { en: 'Moroccan treat & Jacuzzi', ar: 'جلسة مغربية مميزة وجاكوزي' },
            price: fixed(1400),
            includes: {
              en: ['Steam', 'Moroccan soap', 'Scrubbing', 'Moroccan mud & extra scrub'],
              ar: ['بخار', 'صابون مغربي', 'تقشير', 'طين مغربي وتقشير إضافي'],
            },
          },
          { id: 'moroccan-luffa', name: { en: 'Moroccan luffa', ar: 'ليفة مغربية' }, price: fixed(105) },
        ],
      },
      {
        id: 'massage',
        title: { en: 'Massage', ar: 'المساج' },
        showsDuration: true,
        services: [
          { id: 'massage-30', name: { en: 'Regular massage', ar: 'مساج عادي' }, price: fixed(600), durationMin: 30 },
          { id: 'massage-60', name: { en: 'Regular massage', ar: 'مساج عادي' }, price: fixed(900), durationMin: 60 },
          { id: 'reflexology', name: { en: 'Reflexology massage', ar: 'مساج ريفلكسولوجي' }, price: fixed(400), durationMin: 20 },
          { id: 'head-spa', name: { en: 'Head spa massage', ar: 'مساج هيد سبا' }, price: fixed(1000), durationMin: 60 },
        ],
      },
      {
        id: 'hair-removal',
        title: { en: 'Hair removal & bleaching', ar: 'إزالة الشعر والتشقير' },
        note: { en: 'Waxing or sugar', ar: 'واكس أو حلاوة' },
        services: [
          { id: 'wax-half-arms', name: { en: 'Half arms', ar: 'نص دراع' }, price: fixed(150) },
          { id: 'wax-full-arms', name: { en: 'Full arms', ar: 'دراع كامل' }, price: fixed(250) },
          { id: 'wax-underarms', name: { en: 'Underarms', ar: 'تحت الإبط' }, price: fixed(150) },
          { id: 'wax-chest-stomach', name: { en: 'Chest or stomach', ar: 'صدر أو بطن' }, price: fixed(150) },
          { id: 'wax-half-legs', name: { en: 'Half legs', ar: 'نص رجل' }, price: fixed(180) },
          { id: 'wax-full-legs', name: { en: 'Full legs', ar: 'رجل كاملة' }, price: fixed(300) },
          { id: 'wax-bikini-line', name: { en: 'Bikini line', ar: 'خط البكيني' }, price: fixed(200) },
          { id: 'wax-brazilian', name: { en: 'Brazilian', ar: 'برازيليان' }, price: fixed(400) },
          { id: 'wax-half-back', name: { en: 'Half back', ar: 'نص ظهر' }, price: fixed(140) },
          { id: 'wax-full-back', name: { en: 'Full back', ar: 'ظهر كامل' }, price: fixed(200) },
          { id: 'wax-face-neck', name: { en: 'Full face & neck', ar: 'وش ورقبة كامل' }, price: fixed(300) },
          { id: 'wax-full-body', name: { en: 'Full body', ar: 'جسم كامل' }, price: fixed(1500) },
          { id: 'wax-eyebrows', name: { en: 'Eyebrows', ar: 'حواجب' }, price: fixed(120) },
        ],
      },
    ],
  },
  {
    id: 'lashes',
    title: { en: 'Lashes & Brows', ar: 'الرموش والحواجب' },
    sections: [
      {
        id: 'eyelashes',
        title: { en: 'Eyelashes', ar: 'الرموش' },
        services: [
          { id: 'permanent-lashes', name: { en: 'Permanent lashes extension', ar: 'إكستنشن رموش دائمة' }, price: fixed(900) },
          { id: 'permanent-lashes-volume', name: { en: 'Permanent lashes volume extension', ar: 'إكستنشن رموش فوليوم دائمة' }, price: fixed(1100) },
          { id: 'permanent-lashes-refill', name: { en: 'Permanent lashes refill', ar: 'رِفِل رموش دائمة' }, price: fixed(600) },
          { id: 'regular-lashes', name: { en: 'Regular lashes', ar: 'رموش عادية' }, price: fixed(450) },
          { id: 'regular-mega-volume-lashes', name: { en: 'Regular mega volume lashes', ar: 'رموش ميجا فوليوم عادية' }, price: fixed(500) },
        ],
      },
      {
        id: 'threading',
        title: { en: 'Threading', ar: 'الفتلة' },
        services: [
          { id: 'threading-eyebrows', name: { en: 'Eyebrows', ar: 'حواجب' }, price: fixed(120) },
          { id: 'threading-lip-chin-neck', name: { en: 'Upper lip, chin or neck', ar: 'شنب أو دقن أو رقبة' }, price: fixed(50) },
          { id: 'threading-full-face', name: { en: 'Full face', ar: 'وش كامل' }, price: fixed(250) },
          { id: 'threading-face-eyebrows', name: { en: 'Full face + eyebrows', ar: 'وش كامل + حواجب' }, price: fixed(300) },
          { id: 'henna-eyebrows', name: { en: 'Henna eyebrows', ar: 'حواجب حنة' }, price: fixed(100) },
        ],
      },
    ],
  },
  {
    id: 'bridal',
    title: { en: 'Bridal', ar: 'العرايس' },
    sections: [
      {
        id: 'bridal-packages',
        title: { en: 'Bridal packages', ar: 'باكدجات العرايس' },
        services: [
          {
            id: 'lush-package',
            name: { en: 'Lush Package', ar: 'باكدج لاش' },
            price: fixed(5500),
            includes: {
              en: [
                'Any choice of acrylic or hard gel + gel polish',
                'Regular pedicure',
                'Any choice of full body wax or sugar',
                'Facial treatment',
                'Moroccan bath + luffa & one-hour massage',
              ],
              ar: [
                'أكريليك أو هارد جل حسب اختيارك + جل بوليش',
                'باديكير عادي',
                'واكس أو حلاوة للجسم كله حسب اختيارك',
                'تنظيف بشرة',
                'حمام مغربي + ليفة ومساج ساعة',
              ],
            },
          },
          {
            id: 'golden-package',
            name: { en: 'Golden Package', ar: 'الباكدج الذهبي' },
            price: fixed(3000),
            includes: {
              en: ['Gel manicure', 'Regular pedicure', 'One-hour massage', 'Moroccan bath + luffa + body scrub'],
              ar: ['مانيكير جل', 'باديكير عادي', 'مساج ساعة', 'حمام مغربي + ليفة + تقشير للجسم'],
            },
          },
        ],
      },
    ],
  },
]

/** Printed on the bridal page of the price list, under "Customizing your own package". */
export const bridalOffer = {
  moreThanServices: 3,
  brideDiscountPercent: 10,
  bridesmaidDiscountPercent: 5,
} as const

const serviceIndex = new Map<string, { service: Service; section: MenuSection; category: Category }>()
for (const category of categories) {
  for (const section of category.sections) {
    for (const service of section.services) serviceIndex.set(service.id, { service, section, category })
  }
}

export function findService(id: string) {
  return serviceIndex.get(id)
}

export const allServices = [...serviceIndex.values()]
