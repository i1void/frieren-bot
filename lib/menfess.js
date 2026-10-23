// Menfess storage (anonymous messages sent through the bot), kept in bot.db.
//
//  menfess_sessions : one row per menfess. The code (e.g. "A1B2C3") is shown to both sides; only the
//                     owner can look up who sent it (.menfesslog <code>).
//  menfess_routes   : "the bot sent message X, a reply to it goes to Y". This is what makes two-way
//                     conversation work without either side seeing the other's number.
//  menfess_optout   : numbers that do not want to receive menfess.
const crypto = require('crypto')
const { db } = require('./database')

db.exec(`
  CREATE TABLE IF NOT EXISTS menfess_sessions (
    code TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    target TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menfess_routes (
    msg_id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    forward_to TEXT NOT NULL,
    to_target INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menfess_optout (jid TEXT PRIMARY KEY);
`)

const ROUTE_TTL = 7 * 24 * 60 * 60 * 1000 // a reply thread stays alive for 7 days after the last message
const DAY = 24 * 60 * 60 * 1000

const sql = {
  insertSession: db.prepare('INSERT INTO menfess_sessions (code, sender, target, alias, created_at) VALUES (?, ?, ?, ?, ?)'),
  session: db.prepare('SELECT * FROM menfess_sessions WHERE code = ?'),
  sentToday: db.prepare('SELECT COUNT(*) AS total FROM menfess_sessions WHERE sender = ? AND target = ? AND created_at > ?'),
  insertRoute: db.prepare('INSERT OR REPLACE INTO menfess_routes (msg_id, code, forward_to, to_target, created_at) VALUES (?, ?, ?, ?, ?)'),
  route: db.prepare('SELECT * FROM menfess_routes WHERE msg_id = ? AND created_at > ?'),
  pruneRoutes: db.prepare('DELETE FROM menfess_routes WHERE created_at <= ?'),
  isOptedOut: db.prepare('SELECT 1 FROM menfess_optout WHERE jid = ?'),
  optOut: db.prepare('INSERT OR IGNORE INTO menfess_optout (jid) VALUES (?)'),
  optIn: db.prepare('DELETE FROM menfess_optout WHERE jid = ?'),
}

// Numbers are compared by their digits only, so "628123@s.whatsapp.net" and "628123" are the same.
const digits = (jid) => String(jid).split('@')[0].replace(/\D/g, '')

function createSession(sender, target, alias) {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase()
    try {
      sql.insertSession.run(code, sender, target, alias, Date.now())
      return code
    } catch {
      // code already exists, try another one
    }
  }
  throw new Error('could not create a menfess code')
}

const getSession = (code) => sql.session.get(String(code).toUpperCase().replace(/^#/, '')) || null

// How many menfess this sender already sent to this target in the last 24 hours.
const sentToday = (sender, target) => sql.sentToday.get(sender, target, Date.now() - DAY).total

// Remember that bot message `msgId` was delivered, and that a reply to it must be forwarded to `forwardTo`.
function addRoute(msgId, code, forwardTo, toTarget) {
  if (!msgId) return
  sql.insertRoute.run(msgId, code, forwardTo, toTarget ? 1 : 0, Date.now())
  if (Math.random() < 0.05) sql.pruneRoutes.run(Date.now() - ROUTE_TTL)
}

function getRoute(msgId) {
  const row = sql.route.get(msgId, Date.now() - ROUTE_TTL)
  return row ? { code: row.code, forwardTo: row.forward_to, toTarget: row.to_target === 1 } : null
}

const isOptedOut = (jid) => sql.isOptedOut.get(digits(jid)) !== undefined
const optOut = (jid) => sql.optOut.run(digits(jid))
const optIn = (jid) => Number(sql.optIn.run(digits(jid)).changes) > 0

module.exports = { digits, createSession, getSession, sentToday, addRoute, getRoute, isOptedOut, optOut, optIn }
