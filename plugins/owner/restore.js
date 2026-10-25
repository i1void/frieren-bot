const fs = require('fs')
const os = require('os')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const PENDING = path.join(__dirname, '..', '..', 'storage', 'database', 'restore.pending.db')
const MAX_BYTES = 100 * 1024 * 1024
const REQUIRED_TABLES = ['users', 'banned', 'premium']

// Reply to a backup file with .restore. The file is checked, staged, and the bot restarts:
// the swap happens at startup (lib/database.js) because the open database can't be replaced safely.
module.exports = {
  usage: ['restore'],
  use: 'reply backup file',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, m, config, prefix, command, reply }) => {
    const doc = m.quoted
    if (!doc || doc.mtype !== 'documentMessage') return reply(`Reply to a backup file (.db) with ${prefix}${command}`)
    if (!/\.db$/i.test(doc.fileName || '')) return reply('That is not a .db backup file.')
    if (Number(doc.fileLength?.toString() || 0) > MAX_BYTES) return reply('File is too big for a database backup.')

    const check = path.join(os.tmpdir(), `frieren-restore-check-${Date.now()}.db`)
    try {
      const buffer = await sock.downloadMediaMessage(doc)
      if (buffer.subarray(0, 15).toString() !== 'SQLite format 3') return reply('That file is not a SQLite database.')

      fs.writeFileSync(check, buffer)
      const probe = new DatabaseSync(check, { readOnly: true })
      let tables
      try {
        tables = probe.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name)
        if (probe.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') return reply('Database failed the integrity check.')
      } finally {
        probe.close()
      }
      const missing = REQUIRED_TABLES.filter((t) => !tables.includes(t))
      if (missing.length) return reply(`This does not look like a Frieren backup (missing: ${missing.join(', ')}).`)

      fs.copyFileSync(check, PENDING)
      await reply('✅ Backup checked. Restarting to apply it. The current database is kept as storage/database/bot.db.before-restore')
      process.exit(0)
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    } finally {
      fs.rmSync(check, { force: true })
    }
  },
}
