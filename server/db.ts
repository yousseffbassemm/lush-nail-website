import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type DB = DatabaseSync

export type Role = 'customer' | 'staff' | 'admin'

export const REQUEST_STATUSES = ['new', 'contacted', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/**
 * Schema migrations, applied in order and tracked with PRAGMA user_version.
 * Never edit a migration that has shipped; add a new one.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    role          TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
    first_name    TEXT NOT NULL,
    phone         TEXT NOT NULL UNIQUE,
    email         TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    branch_id     TEXT,
    lang          TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ar')),
    disabled      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE requests (
    id               INTEGER PRIMARY KEY,
    reference        TEXT NOT NULL UNIQUE,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    kind             TEXT NOT NULL CHECK (kind IN ('appointment', 'bridal')),
    branch_id        TEXT NOT NULL,
    services_json    TEXT NOT NULL,
    look_ref         TEXT,
    help_me_choose   INTEGER NOT NULL DEFAULT 0,
    preferred_date   TEXT NOT NULL,
    preferred_time   TEXT,
    event_date       TEXT,
    group_size       INTEGER,
    notes            TEXT NOT NULL DEFAULT '',
    lang             TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'new',
    confirmed_date   TEXT,
    confirmed_time   TEXT,
    customer_message TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );
  CREATE INDEX requests_user ON requests(user_id);
  CREATE INDEX requests_branch_status ON requests(branch_id, status);

  CREATE TABLE request_events (
    id         INTEGER PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    actor_id   INTEGER REFERENCES users(id),
    type       TEXT NOT NULL,
    status     TEXT,
    note       TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX request_events_request ON request_events(request_id);

  CREATE TABLE reset_codes (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    expires_at TEXT NOT NULL,
    used_at    TEXT,
    attempts   INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX reset_codes_user ON reset_codes(user_id);
  `,
]

export function openDatabase(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number }
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
  return db
}

/** Runs `fn` inside a transaction. */
export function transaction<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export const nowIso = () => new Date().toISOString()
