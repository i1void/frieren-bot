import { db } from '../../lib/sqlite.js'
import { runtime } from '../../lib/utils.js'

db.exec('CREATE TABLE IF NOT EXISTS afk (jid TEXT PRIMARY KEY, since INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT \'\')')
const find = db.prepare('SELECT since, reason FROM afk WHERE jid = ?')
const remove = db.prepare('DELETE FROM afk WHERE jid = ?')

const NOTICE_COOLDOWN = 30 * 1000 // the same AFK person is announced at most once per 30s in a chat
const lastNotice = new Map()
const tagOf = (jid) => String(jid).split('@')[0]
const since = (ts) => runtime((Date.now() - ts) / 1000)

export default {
  name: 'afk-detector',
  event: true,
  groupOnly: true,
  execute: async ({ sock, m, config }) => {
    if (m.fromMe) return false

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
