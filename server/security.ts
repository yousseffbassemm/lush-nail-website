import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Password hashing with scrypt at OWASP's recommended cost (N=2^17, r=8, p=1).
 * Tests may lower N through LUSH_SCRYPT_N (never below 2^14) to keep the suite fast.
 */
const N = Math.max(2 ** 14, Number(process.env.LUSH_SCRYPT_N) || 2 ** 17)
const R = 8
const P = 1
const KEY_LENGTH = 32

function derive(password: string, salt: Buffer, n: number, r: number, p: number) {
  const options: ScryptOptions = { N: n, r, p, maxmem: 128 * n * r * 2 }
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64')
  const actual = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

let dummyHash: Promise<string> | null = null
/** Verifies against a throwaway hash so unknown accounts take as long as known ones. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  await verifyPassword(password, await dummyHash)
}

export const newToken = () => randomBytes(32).toString('base64url')

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

// Crockford base32 without I, L, O, U: easy to read aloud over the phone.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export function randomCode(length: number) {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

/** Normalises a code typed by a person: case, spaces, dashes and look-alike letters. */
export function normaliseCode(input: string) {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0')
}

/** Fixed-window rate limiter kept in memory; enough for a single-process salon site. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true when the action is allowed, and records it. */
  take(key: string, now = Date.now()) {
    const entry = this.hits.get(key)
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs })
      if (this.hits.size > 10_000) this.sweep(now)
      return true
    }
    entry.count += 1
    return entry.count <= this.limit
  }

  reset(key: string) {
    this.hits.delete(key)
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key)
  }
}
