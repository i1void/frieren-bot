// Ban list and premium list (JIDs), shared by the router and owner plugins.
const { db, transaction } = require('./database')
const { getTimezone } = require('./db')

function jidList(table) {
  const all = db.prepare(`SELECT jid FROM ${table} ORDER BY rowid`)
  const has = db.prepare(`SELECT 1 FROM ${table} WHERE jid = ?`)
  const clear = db.prepare(`DELETE FROM ${table}`)
  const add = db.prepare(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`)

  return {
    get: () => all.all().map((row) => row.jid),
    has: (jid) => has.get(jid) !== undefined,
    set: (list) =>
      transaction(() => {
        clear.run()
        for (const jid of list) add.run(jid)
      }),
  }
}

const banned = jidList('banned')

// ---- Premium ----------------------------------------------------------------------
// premium.expires_at is a timestamp in epoch milliseconds (UTC), or NULL for permanent premium.
// Expired rows are not deleted: they simply stop counting.
const DAY_MS = 24 * 60 * 60 * 1000

const premiumSql = {
  active: db.prepare('SELECT jid, expires_at FROM premium WHERE expires_at IS NULL OR expires_at > ? ORDER BY rowid'),
  find: db.prepare('SELECT expires_at FROM premium WHERE jid = ?'),
  has: db.prepare('SELECT 1 FROM premium WHERE jid = ? AND (expires_at IS NULL OR expires_at > ?)'),
  upsert: db.prepare('INSERT INTO premium (jid, expires_at) VALUES (?, ?) ON CONFLICT(jid) DO UPDATE SET expires_at = excluded.expires_at'),
  remove: db.prepare('DELETE FROM premium WHERE jid = ?'),
}

// Active premium users: [{ jid, expiresAt }] (expiresAt is null for permanent).
const listPremium = (now = Date.now()) => premiumSql.active.all(now).map((row) => ({ jid: row.jid, expiresAt: row.expires_at }))
const getPremium = (now = Date.now()) => listPremium(now).map((row) => row.jid)
const hasPremium = (jid, now = Date.now()) => premiumSql.has.get(jid, now) !== undefined

// Gives premium for `days` days, or forever when days is null. Days are added on top of any time the
// user still has left. A permanent user stays permanent. Returns the new expiry (null = permanent).
function addPremium(jid, days = null, now = Date.now()) {
  return transaction(() => {
    const row = premiumSql.find.get(jid)
    const permanent = row && row.expires_at === null
    if (days === null || permanent) {
      premiumSql.upsert.run(jid, null)
      return null
    }
    const base = row && row.expires_at > now ? row.expires_at : now
    const expiresAt = base + days * DAY_MS
    premiumSql.upsert.run(jid, expiresAt)
    return expiresAt
  })
}

// True when the user was in the premium table (even if it had already expired).
const removePremium = (jid) => Number(premiumSql.remove.run(jid).changes) > 0

// "permanent", or the expiry as "20 Nov 2026, 10:55 (Asia/Jakarta)" in the timezone from config.js.
function formatExpiry(expiresAt, config) {
  if (expiresAt === null || expiresAt === undefined) return 'permanent'
  const timeZone = getTimezone(config)
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(expiresAt))
  return `${text} (${timeZone})`
}

module.exports = {
  getBanned: banned.get,
  setBanned: banned.set,
  isBanned: banned.has,
  listPremium,
  getPremium,
  hasPremium,
  addPremium,
  removePremium,
  formatExpiry,
}
