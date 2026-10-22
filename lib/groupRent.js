// How long the bot stays in a group (set with `.gc <no> 30d`, `.gc <no> forever`, `.gc <no> reset`).
// No row, or expires_at = 0 and stay = 0, means "not set": the bot stays until someone removes it.
const { db } = require('./database')
const { setMuted } = require('./mute')

const DAY = 86400000
const CHECK_EVERY = 60 * 60 * 1000 // expiry is counted in days, so an hourly check is plenty
const WARN_DAYS = 3

const get = db.prepare('SELECT expires_at, stay FROM group_rent WHERE chat = ?')
const upsert = db.prepare(
  `INSERT INTO group_rent (chat, expires_at, stay, last_notified) VALUES (?, ?, ?, 0)
   ON CONFLICT(chat) DO UPDATE SET expires_at = excluded.expires_at, stay = excluded.stay, last_notified = 0`
)
const remove = db.prepare('DELETE FROM group_rent WHERE chat = ?')
const timed = db.prepare('SELECT chat, expires_at, last_notified FROM group_rent WHERE expires_at > 0')
const markNotified = db.prepare('UPDATE group_rent SET last_notified = ? WHERE chat = ?')

// { expiresAt, stay } for a group. expiresAt = 0 when no duration is set.
function getRent(chat) {
  const row = get.get(chat)
  return { expiresAt: row?.expires_at || 0, stay: Boolean(row?.stay) }
}

// Adds days to the stay. A new duration starts from now, an existing one is extended.
function addDays(chat, days, now = Date.now()) {
  const { expiresAt } = getRent(chat)
  upsert.run(chat, (expiresAt > now ? expiresAt : now) + days * DAY, 0)
}

function setForever(chat) {
  upsert.run(chat, 0, 1)
}

function resetRent(chat) {
  remove.run(chat)
}

// Forget everything stored for a group the bot has left.
function forgetGroup(chat) {
  remove.run(chat)
  setMuted(chat, false)
}

// "3d 4h", "5h 20m" or "less than a minute".
function formatLeft(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  const parts = [d && `${d}d`, h && `${h}h`, !d && m && `${m}m`].filter(Boolean)
  return parts.length ? parts.join(' ') : 'less than a minute'
}

// Warns groups in their last days and leaves the ones that ran out.
async function checkRent(sock, now = Date.now()) {
  for (const row of timed.all()) {
    try {
      const daysLeft = Math.ceil((row.expires_at - now) / DAY)
      if (daysLeft > 0 && daysLeft <= WARN_DAYS && row.last_notified !== daysLeft) {
        await sock.sendMessage(row.chat, { text: `⚠ The bot's active period in this group ends in ${daysLeft} day(s).` })
        markNotified.run(daysLeft, row.chat)
      } else if (daysLeft <= 0) {
        await sock.sendMessage(row.chat, { text: "⚠ The bot's active period in this group has ended." }).catch(() => {})
        await sock.groupLeave(row.chat).catch(() => {})
        forgetGroup(row.chat)
      }
    } catch (err) {
      console.error(`[group-rent] ${row.chat}:`, err)
    }
  }
}

let timer = null

// Called on every (re)connect with the fresh socket; only one timer ever runs.
function startRentWatcher(sock) {
  clearInterval(timer)
  const run = () => checkRent(sock).catch((err) => console.error('[group-rent]', err))
  timer = setInterval(run, CHECK_EVERY)
  timer.unref()
  run()
}

module.exports = { getRent, addDays, setForever, resetRent, forgetGroup, formatLeft, checkRent, startRentWatcher }
