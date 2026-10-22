// Group management storage and helpers:
//   - mute: groups where the bot stays silent (checked in handler.js, toggled by .mute and .gc)
//   - list: numbered group list shared by .groups and .gc
//   - stay: how long the bot stays in a group (.gc <no> 30d / forever / reset) and the expiry watcher
const { db } = require('./database')

const DAY = 86400000
const CHECK_EVERY = 60 * 60 * 1000 // expiry is counted in days, so an hourly check is plenty
const WARN_DAYS = 3

// ---- Mute -----------------------------------------------------------------------

const findMuted = db.prepare('SELECT 1 FROM muted_groups WHERE chat = ?')
const addMuted = db.prepare('INSERT OR IGNORE INTO muted_groups (chat) VALUES (?)')
const removeMuted = db.prepare('DELETE FROM muted_groups WHERE chat = ?')

const isMuted = (chat) => findMuted.get(chat) !== undefined

function setMuted(chat, muted) {
  if (muted) addMuted.run(chat)
  else removeMuted.run(chat)
}

// ---- Group list -----------------------------------------------------------------

// Groups the bot is in, in a fixed order (by name) so the numbers match between .groups and .gc.
async function listGroups(sock) {
  const all = Object.values(await sock.groupFetchAllParticipating())
  return all.sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || a.id.localeCompare(b.id))
}

// ---- Stay duration --------------------------------------------------------------
// No row, or expires_at = 0 and stay = 0, means "not set": the bot stays until someone removes it.

const getRentRow = db.prepare('SELECT expires_at, stay FROM group_rent WHERE chat = ?')
const upsertRent = db.prepare(
  `INSERT INTO group_rent (chat, expires_at, stay, last_notified) VALUES (?, ?, ?, 0)
   ON CONFLICT(chat) DO UPDATE SET expires_at = excluded.expires_at, stay = excluded.stay, last_notified = 0`
)
const removeRent = db.prepare('DELETE FROM group_rent WHERE chat = ?')
const timedRents = db.prepare('SELECT chat, expires_at, last_notified FROM group_rent WHERE expires_at > 0')
const markNotified = db.prepare('UPDATE group_rent SET last_notified = ? WHERE chat = ?')

// { expiresAt, stay } for a group. expiresAt = 0 when no duration is set.
function getRent(chat) {
  const row = getRentRow.get(chat)
  return { expiresAt: row?.expires_at || 0, stay: Boolean(row?.stay) }
}

// Adds days to the stay. A new duration starts from now, an existing one is extended.
function addDays(chat, days, now = Date.now()) {
  const { expiresAt } = getRent(chat)
  upsertRent.run(chat, (expiresAt > now ? expiresAt : now) + days * DAY, 0)
}

function setForever(chat) {
  upsertRent.run(chat, 0, 1)
}

function resetRent(chat) {
  removeRent.run(chat)
}

// Forget everything stored for a group the bot has left.
function forgetGroup(chat) {
  removeRent.run(chat)
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
  for (const row of timedRents.all()) {
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

module.exports = {
  isMuted,
  setMuted,
  listGroups,
  getRent,
  addDays,
  setForever,
  resetRent,
  forgetGroup,
  formatLeft,
  checkRent,
  startRentWatcher,
}
