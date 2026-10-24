const { db } = require('../../lib/database')

// AFK status, kept in bot.db. The detector in plugins/_events/afk.js reads the same table.
db.exec('CREATE TABLE IF NOT EXISTS afk (jid TEXT PRIMARY KEY, since INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT \'\')')
const setAfk = db.prepare('INSERT OR REPLACE INTO afk (jid, since, reason) VALUES (?, ?, ?)')

module.exports = {
  usage: ['afk'],
  use: 'reason (optional)',
  category: 'group',
  groupOnly: true,
  execute: async ({ m, text, reply }) => {
    const reason = text.replace(/\s+/g, ' ').trim().slice(0, 100)
    setAfk.run(m.sender, Date.now(), reason)
    const tag = m.sender.split('@')[0]
    reply(`😴 @${tag} is now AFK${reason ? `\nReason: ${reason}` : ''}`, { mentions: [m.sender] })
  },
}
