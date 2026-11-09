import { db, transaction } from './sqlite.js'
import { getTimezone } from './limits.js'

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

const DAY_MS = 24 * 60 * 60 * 1000

const premiumSql = {
  active: db.prepare('SELECT jid, expires_at FROM premium WHERE expires_at IS NULL OR expires_at > ? ORDER BY rowid'),
  find: db.prepare('SELECT expires_at FROM premium WHERE jid = ?'),
  has: db.prepare('SELECT 1 FROM premium WHERE jid = ? AND (expires_at IS NULL OR expires_at > ?)'),
  upsert: db.prepare('INSERT INTO premium (jid, expires_at) VALUES (?, ?) ON CONFLICT(jid) DO UPDATE SET expires_at = excluded.expires_at'),
  remove: db.prepare('DELETE FROM premium WHERE jid = ?'),
}

const listPremium = (now = Date.now()) => premiumSql.active.all(now).map((row) => ({ jid: row.jid, expiresAt: row.expires_at }))
const getPremium = (now = Date.now()) => listPremium(now).map((row) => row.jid)
const hasPremium = (jid, now = Date.now()) => premiumSql.has.get(jid, now) !== undefined

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

const removePremium = (jid) => Number(premiumSql.remove.run(jid).changes) > 0

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

const getBanned = banned.get
const setBanned = banned.set
const isBanned = banned.has

export { getBanned, setBanned, isBanned, listPremium, getPremium, hasPremium, addPremium, removePremium, formatExpiry }
