import { db } from './sqlite.js'

db.exec(`
  CREATE TABLE IF NOT EXISTS member_activity (
    chat TEXT NOT NULL,
    jid TEXT NOT NULL,
    last_seen INTEGER NOT NULL,
    PRIMARY KEY (chat, jid)
  );
  CREATE TABLE IF NOT EXISTS activity_start (chat TEXT PRIMARY KEY, since INTEGER NOT NULL);
`)

const upsert = db.prepare(
  `INSERT INTO member_activity (chat, jid, last_seen) VALUES (?, ?, ?)
   ON CONFLICT(chat, jid) DO UPDATE SET last_seen = excluded.last_seen`
)
const markStart = db.prepare('INSERT OR IGNORE INTO activity_start (chat, since) VALUES (?, ?)')
const readStart = db.prepare('SELECT since FROM activity_start WHERE chat = ?')
const readAll = db.prepare('SELECT jid, last_seen FROM member_activity WHERE chat = ?')

const WRITE_EVERY = 60 * 1000 // one write per person per minute is plenty for "days ago"
const recent = new Map()

function recordActivity(chat, jid, now = Date.now()) {
  const key = `${chat}|${jid}`
  if (now - (recent.get(key) || 0) < WRITE_EVERY) return
  recent.set(key, now)
  if (recent.size > 5000) recent.clear()
  markStart.run(chat, now)
  upsert.run(chat, jid, now)
}

const trackingSince = (chat) => readStart.get(chat)?.since ?? null
const activityMap = (chat) => new Map(readAll.all(chat).map((row) => [row.jid, row.last_seen]))

export { recordActivity, trackingSince, activityMap }
