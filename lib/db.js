// User limits, stored in the "users" table of bot.db (see lib/database.js).
const { db } = require('./database')

const DEFAULT_TIMEZONE = 'Asia/Jakarta'

// Timezone used for the daily limit reset. Optional `timezone` key in config.js.
const getTimezone = (config) => config.timezone || DEFAULT_TIMEZONE

// Current date as YYYY-MM-DD in the configured timezone.
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

// Reads (and creates) a user. The daily reset is lazy: the first time a user is
// read on a new day, their limit is topped up to the free amount (bonus limit
// above it is kept). No cron job is needed.
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

// Takes one limit point; false when none is left. It is a single UPDATE, so two
// commands running at the same time can never spend the same point twice.
function spendLimit(id, config) {
  getUser(id, config) // creates the user and applies the daily reset first
  return sql.spend.run(id).changes > 0
}

// Gives back one point (the job failed before anything was delivered).
function restoreLimit(id) {
  sql.add.run(1, id)
}

function addLimit(id, amount, config) {
  getUser(id, config)
  sql.add.run(amount, id)
}

const countUsers = () => sql.count.get().total

module.exports = { getUser, spendLimit, restoreLimit, addLimit, countUsers, getTimezone, today }
