const { db } = require('../../lib/database')
const { runtime } = require('../../lib/myfunc')

db.exec('CREATE TABLE IF NOT EXISTS afk (jid TEXT PRIMARY KEY, since INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT \'\')')
const find = db.prepare('SELECT since, reason FROM afk WHERE jid = ?')
const remove = db.prepare('DELETE FROM afk WHERE jid = ?')

const NOTICE_COOLDOWN = 30 * 1000 // the same AFK person is announced at most once per 30s in a chat
const lastNotice = new Map()
const tagOf = (jid) => String(jid).split('@')[0]
const since = (ts) => runtime((Date.now() - ts) / 1000)

// 1) An AFK person who writes again is back: the status is removed and the group is told.
// 2) Someone who tags or replies to an AFK person is told that person is away (and why).
// It never stops a message: commands in the same message still run.
module.exports = {
  name: 'afk-detector',
  event: true,
  groupOnly: true,
  execute: async ({ sock, m, config }) => {
    if (m.fromMe) return false

    // ".afk" itself sets the status (plugins/group/afk.js), so it must not count as "coming back".
    const text = (m.text || '').trim()
    const isAfkCommand = config.prefixes.some((p) => p && text.startsWith(p) && /^afk(\s|$)/i.test(text.slice(p.length)))

    if (!isAfkCommand) {
      const mine = find.get(m.sender)
      if (mine) {
        remove.run(m.sender)
        await sock.sendMessage(
          m.chat,
          { text: `👋 @${tagOf(m.sender)} is back after being AFK for ${since(mine.since)}${mine.reason ? `\nPrevious reason: ${mine.reason}` : ''}`, mentions: [m.sender] },
          { quoted: m }
        )
      }
    }

    const targets = new Set([...(m.mentionedJid || []), m.quoted?.sender].filter(Boolean))
    targets.delete(m.sender)

    const lines = []
    const mentions = []
    for (const jid of targets) {
      const row = find.get(jid)
      if (!row) continue
      const key = `${m.chat}|${jid}`
      if (Date.now() - (lastNotice.get(key) || 0) < NOTICE_COOLDOWN) continue
      lastNotice.set(key, Date.now())
      lines.push(`*AFK* : @${tagOf(jid)}\n• Reason: ${row.reason || '-'}\n• Since: ${since(row.since)} ago`)
      mentions.push(jid)
    }
    if (lastNotice.size > 500) lastNotice.clear()

    if (lines.length) await sock.sendMessage(m.chat, { text: lines.join('\n\n'), mentions }, { quoted: m })
    return false
  },
}
