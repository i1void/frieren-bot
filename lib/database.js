// SQLite storage. Uses the built-in node:sqlite module, so there is no package to install.
// Everything lives in one file: storage/database/bot.db
const fs = require('fs')
const path = require('path')

let DatabaseSync
try {
  ;({ DatabaseSync } = require('node:sqlite'))
} catch {
  throw new Error('This bot stores its data with node:sqlite, which needs Node.js 22.13 or newer.')
}

const DB_DIR = path.join(__dirname, '..', 'storage', 'database')
const BACKUP_DIR = path.join(DB_DIR, 'json-backup')

fs.mkdirSync(DB_DIR, { recursive: true })

const db = new DatabaseSync(path.join(DB_DIR, 'bot.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    quota INTEGER NOT NULL,
    last_reset TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS banned (jid TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS premium (jid TEXT PRIMARY KEY, expires_at INTEGER);
  CREATE TABLE IF NOT EXISTS disabled_plugins (name TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS antilink (chat TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS group_settings (
    chat TEXT PRIMARY KEY,
    welcome_text TEXT,
    left_text TEXT,
    welcome_on INTEGER,
    left_on INTEGER
  );
`)

// Premium used to be a plain JID list. expires_at (epoch milliseconds, NULL = permanent) is added in
// place, so existing premium users stay premium forever until they are removed.
if (!db.prepare('PRAGMA table_info(premium)').all().some((column) => column.name === 'expires_at')) {
  db.exec('ALTER TABLE premium ADD COLUMN expires_at INTEGER')
}

// Runs fn inside one transaction: all of it is saved, or none of it.
function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// One upsert per group_settings column (column names come from this fixed list only).
const groupSetters = Object.fromEntries(
  ['welcome_text', 'left_text', 'welcome_on', 'left_on'].map((column) => [
    column,
    db.prepare(
      `INSERT INTO group_settings (chat, ${column}) VALUES (?, ?) ON CONFLICT(chat) DO UPDATE SET ${column} = excluded.${column}`
    ),
  ])
)

// ---- One-time import of the old JSON files --------------------------------------
// Older versions kept their data in storage/database/*.json. When those files are
// found they are imported once and moved to storage/database/json-backup/.

const LEGACY_NAMES = ['users', 'banned', 'premium', 'settings', 'antilink', 'welcome', 'left', 'welcome-status', 'left-status']

const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
const asArray = (v) => (Array.isArray(v) ? v : [])

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function importLegacyJson() {
  const legacyPath = (name) => path.join(DB_DIR, `${name}.json`)
  const found = LEGACY_NAMES.filter((name) => fs.existsSync(legacyPath(name)))
  if (!found.length) return

  const read = (name, fallback) => readJson(legacyPath(name), fallback)
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, quota, last_reset) VALUES (?, ?, ?)')
  const insertJid = (table) => db.prepare(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`)
  const insertBanned = insertJid('banned')
  const insertPremium = insertJid('premium')
  const insertPlugin = db.prepare('INSERT OR IGNORE INTO disabled_plugins (name) VALUES (?)')
  const insertAntilink = db.prepare('INSERT OR IGNORE INTO antilink (chat) VALUES (?)')
  const importGroupSettings = (column, name, convert) => {
    for (const [chat, value] of Object.entries(asObject(read(name, {})))) {
      const converted = convert(value)
      if (converted !== null) groupSetters[column].run(chat, converted)
    }
  }
  const asText = (v) => (typeof v === 'string' && v ? v : null)
  const asFlag = (v) => (typeof v === 'boolean' ? Number(v) : null)

  transaction(() => {
    for (const [id, user] of Object.entries(asObject(read('users', {})))) {
      const quota = Number.isInteger(user?.limit) ? user.limit : 0
      insertUser.run(id, quota, typeof user?.lastReset === 'string' ? user.lastReset : '')
    }
    for (const jid of asArray(read('banned', []))) insertBanned.run(String(jid))
    for (const jid of asArray(read('premium', []))) insertPremium.run(String(jid))
    for (const name of asArray(asObject(read('settings', {})).disabledPlugins)) insertPlugin.run(String(name))
    for (const chat of asArray(read('antilink', []))) insertAntilink.run(String(chat))
    importGroupSettings('welcome_text', 'welcome', asText)
    importGroupSettings('left_text', 'left', asText)
    importGroupSettings('welcome_on', 'welcome-status', asFlag)
    importGroupSettings('left_on', 'left-status', asFlag)
  })

  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  for (const name of found) fs.renameSync(legacyPath(name), path.join(BACKUP_DIR, `${name}.json`))
  console.log(`[database] imported ${found.length} old JSON file(s); originals moved to storage/database/json-backup/`)
}

importLegacyJson()

// Close cleanly so the -wal file is merged back into bot.db.
process.on('exit', () => {
  try {
    db.close()
  } catch {
    // already closed
  }
})

module.exports = { db, transaction, groupSetters }
