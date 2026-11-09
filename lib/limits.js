import { db } from './sqlite.js'

const DEFAULT_TIMEZONE = 'Asia/Jakarta'

const getTimezone = () => process.env.TZ || DEFAULT_TIMEZONE

function today(config, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getTimezone(config),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

const sql = {
  find: db.prepare('SELECT quota, last_reset FROM users WHERE id = ?'),
  create: db.prepare('INSERT INTO users (id, quota, last_reset) VALUES (?, ?, ?)'),
  topUp: db.prepare('UPDATE users SET quota = MAX(quota, ?), last_reset = ? WHERE id = ?'),
  add: db.prepare('UPDATE users SET quota = quota + ? WHERE id = ?'),
  spend: db.prepare('UPDATE users SET quota = quota - 1 WHERE id = ? AND quota > 0'),
  count: db.prepare('SELECT COUNT(*) AS total FROM users'),
}

function getUser(id, config, now = new Date()) {
  const day = today(config, now)
  let row = sql.find.get(id)

  if (!row) {
    sql.create.run(id, config.limit.free, day)
    return { limit: config.limit.free, premium: false, lastReset: day }
  }
  if (row.last_reset !== day) {
    sql.topUp.run(config.limit.free, day, id)
    row = sql.find.get(id)
  }
  return { limit: row.quota, premium: false, lastReset: row.last_reset }
}

function spendLimit(id, config) {
  getUser(id, config) // creates the user and applies the daily reset first
  return sql.spend.run(id).changes > 0
}

function restoreLimit(id) {
  sql.add.run(1, id)
}

function addLimit(id, amount, config) {
  getUser(id, config)
  sql.add.run(amount, id)
}

const countUsers = () => sql.count.get().total

export { getUser, spendLimit, restoreLimit, addLimit, countUsers, getTimezone, today }
