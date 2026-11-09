import crypto from 'node:crypto'
import { db } from './sqlite.js'

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

try {
  db.exec('ALTER TABLE menfess_routes ADD COLUMN delivered_to TEXT')
} catch {}

const DAY = 24 * 60 * 60 * 1000
const CHAT_WINDOW = DAY // answering without "Reply" works this long after the last menfess message received
const ROUTE_TTL = 7 * DAY // answering with "Reply" works this long

const sql = {
  insertSession: db.prepare('INSERT INTO menfess_sessions (code, sender, target, alias, created_at) VALUES (?, ?, ?, ?, ?)'),
  session: db.prepare('SELECT * FROM menfess_sessions WHERE code = ?'),
  sentToday: db.prepare('SELECT COUNT(*) AS total FROM menfess_sessions WHERE sender = ? AND target = ? AND created_at > ?'),
  insertRoute: db.prepare('INSERT OR REPLACE INTO menfess_routes (msg_id, code, forward_to, to_target, created_at, delivered_to) VALUES (?, ?, ?, ?, ?, ?)'),
  route: db.prepare('SELECT * FROM menfess_routes WHERE msg_id = ? AND created_at > ?'),
  latestRoute: db.prepare('SELECT * FROM menfess_routes WHERE delivered_to = ? AND created_at > ? ORDER BY created_at DESC, rowid DESC LIMIT 1'),
  pruneRoutes: db.prepare('DELETE FROM menfess_routes WHERE created_at <= ?'),
  isOptedOut: db.prepare('SELECT 1 FROM menfess_optout WHERE jid = ?'),
  optOut: db.prepare('INSERT OR IGNORE INTO menfess_optout (jid) VALUES (?)'),
  optIn: db.prepare('DELETE FROM menfess_optout WHERE jid = ?'),
}

const digits = (jid) => String(jid).split('@')[0].replace(/\D/g, '')

const quoteBlock = (text) => String(text).trim().split('\n').map((line) => `> ${line}`).join('\n')

function createSession(sender, target, alias) {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase()
    try {
      sql.insertSession.run(code, sender, target, alias, Date.now())
      return code
    } catch {
    }
  }
  throw new Error('could not create a menfess code')
}

const getSession = (code) => sql.session.get(String(code).toUpperCase().replace(/^#/, '')) || null

const sentToday = (sender, target) => sql.sentToday.get(sender, target, Date.now() - DAY).total

function addRoute(msgId, code, forwardTo, toTarget, deliveredTo) {
  if (!msgId) return
  sql.insertRoute.run(msgId, code, forwardTo, toTarget ? 1 : 0, Date.now(), digits(deliveredTo))
  if (Math.random() < 0.05) sql.pruneRoutes.run(Date.now() - ROUTE_TTL)
}

const toRoute = (row) => (row ? { msgId: row.msg_id, code: row.code, forwardTo: row.forward_to, toTarget: row.to_target === 1 } : null)

const getRoute = (msgId) => toRoute(sql.route.get(msgId, Date.now() - ROUTE_TTL))

const getActiveRoute = (chat) => toRoute(sql.latestRoute.get(digits(chat), Date.now() - CHAT_WINDOW))

const getExpiredRoute = (chat) => toRoute(sql.latestRoute.get(digits(chat), Date.now() - ROUTE_TTL))

const isOptedOut = (jid) => sql.isOptedOut.get(digits(jid)) !== undefined
const optOut = (jid) => sql.optOut.run(digits(jid))
const optIn = (jid) => Number(sql.optIn.run(digits(jid)).changes) > 0

export { quoteBlock, digits, createSession, getSession, sentToday, addRoute, getRoute, getActiveRoute, getExpiredRoute, isOptedOut, optOut, optIn }
