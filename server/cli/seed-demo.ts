/**
 * Fills a development database with clearly fictional demo data, for presenting the staff dashboard.
 *
 *   npm run seed:demo
 *
 * Refuses to run in production. Creates:
 *   admin     010 0000 0001 / demo-admin-2026
 *   staff     010 0000 0002 / demo-staff-2026 (New Cairo)
 *   customer  010 0000 0003 / demo-customer-2026
 */
import { openDatabase } from '../db'
import { hashPassword } from '../security'
import { findUserByPhone, insertRequest, insertUser, updateStatus, type UserRow } from '../store'
import { addDays, nowInCairo } from '../../src/booking/cairoTime'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:demo is for development databases only.')
  process.exit(1)
}

const db = openDatabase(process.env.DB_PATH ?? 'data/lush.db')

async function user(role: UserRow['role'], firstName: string, phone: string, password: string, branchId: string | null = null) {
  return (
    findUserByPhone(db, phone) ??
    insertUser(db, { role, firstName, phone, email: null, passwordHash: await hashPassword(password), branchId, lang: 'en' })
  )
}

const admin = await user('admin', 'Demo Owner', '+201000000001', 'demo-admin-2026')
const staff = await user('staff', 'Demo Reception', '+201000000002', 'demo-staff-2026', 'new-cairo')
const customers = [
  await user('customer', 'Demo Customer', '+201000000003', 'demo-customer-2026'),
  await user('customer', 'Demo Nour', '+201000000004', 'demo-customer-2026'),
  await user('customer', 'Demo Salma', '+201000000005', 'demo-customer-2026'),
  await user('customer', 'Demo Farida', '+201000000006', 'demo-customer-2026'),
]

const already = (db.prepare('SELECT COUNT(*) AS n FROM requests').get() as { n: number }).n
if (already > 0) {
  console.log(`Demo accounts ready; ${already} requests already exist, so no new requests were added.`)
  process.exit(0)
}

const today = nowInCairo().date
const seed = [
  { who: 0, branchId: 'new-cairo', serviceIds: ['gel-x', 'chrome-finish'], lookRef: 'LK-03', date: addDays(today, 1), time: '16:30', notes: 'Medium almond, please.' },
  { who: 1, branchId: 'new-cairo', serviceIds: ['basic-manicure-pedicure'], date: addDays(today, 2), time: '12:00', notes: '' },
  { who: 2, branchId: 'heliopolis', serviceIds: ['moroccan-bath-jacuzzi', 'massage-60'], date: addDays(today, 3), time: null, notes: 'Any time after 2 pm works.' },
  { who: 3, branchId: 'new-cairo', serviceIds: ['lush-package'], bridal: true, date: addDays(today, 10), time: '11:00', eventDate: addDays(today, 14), groupSize: 4, notes: 'Three bridesmaids would like manicures.' },
  { who: 1, branchId: 'heliopolis', serviceIds: [], helpMeChoose: true, date: addDays(today, 1), time: '18:00', notes: 'First visit, not sure what I need.' },
]

const created = seed.map((s) =>
  insertRequest(db, customers[s.who].id, {
    kind: s.bridal ? 'bridal' : 'appointment',
    branchId: s.branchId,
    serviceIds: s.serviceIds,
    lookRef: s.lookRef ?? null,
    helpMeChoose: s.helpMeChoose ?? false,
    preferredDate: s.date,
    preferredTime: s.time,
    eventDate: s.eventDate ?? null,
    groupSize: s.groupSize ?? null,
    notes: s.notes,
    lang: 'en',
  }),
)

updateStatus(db, created[1].id, staff.id, { status: 'confirmed', confirmedDate: created[1].preferred_date, confirmedTime: '12:30', customerMessage: 'See you at 12:30.' })
updateStatus(db, created[2].id, admin.id, { status: 'contacted' })

console.log('Demo data added. Sign in at /admin with 010 0000 0001 / demo-admin-2026 (see server/cli/seed-demo.ts).')
