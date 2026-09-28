/**
 * Creates the first admin account (or promotes an existing account to admin).
 *
 *   npm run create-admin
 *
 * Prompts for a name, mobile number and password. Other staff are then added from /admin.
 */
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { openDatabase } from '../db'
import { hashPassword } from '../security'
import { findUserByPhone, insertUser } from '../store'
import { toE164 } from '../../src/booking/validation'

function ask(question: string, hidden = false) {
  return new Promise<string>((resolveAnswer) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    if (hidden) {
      // Echo asterisks instead of the password.
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl)
      ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) =>
        write(s.startsWith(question) ? s : s.replace(/[^\r\n]/g, '*'))
    }
    rl.question(question, (answer) => {
      rl.close()
      resolveAnswer(answer.trim())
    })
  })
}

const db = openDatabase(process.env.DB_PATH ?? 'data/lush.db')

const name = await ask('Admin first name: ')
const phone = toE164(await ask('Mobile number (login): '))
if (!name || !phone) {
  console.error('A first name and a valid mobile number are required.')
  process.exit(1)
}
const password = await ask('Password (at least 12 characters): ', true)
if (password.length < 12) {
  console.error('\nUse at least 12 characters for an admin password.')
  process.exit(1)
}

const existing = findUserByPhone(db, phone)
if (existing) {
  db.prepare("UPDATE users SET role = 'admin', branch_id = NULL, disabled = 0, password_hash = ? WHERE id = ?").run(
    await hashPassword(password),
    existing.id,
  )
  console.log(`\n${existing.first_name} (${phone}) is now an admin with the new password.`)
} else {
  insertUser(db, { role: 'admin', firstName: name, phone, email: null, passwordHash: await hashPassword(password), branchId: null, lang: 'en' })
  console.log(`\nAdmin ${name} (${phone}) created. Sign in at /admin.`)
}
