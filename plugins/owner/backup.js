const fs = require('fs')
const os = require('os')
const path = require('path')
const { db } = require('../../lib/database')

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13)

// Sends a consistent copy of bot.db (VACUUM INTO also folds in the WAL file) as a document.
// The WhatsApp session is NOT included: it holds the login and must never be sent around.
module.exports = {
  usage: ['backup'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, m, reply, isGroup }) => {
    if (isGroup) return reply('Use this in a private chat, not in a group.')
    const file = path.join(os.tmpdir(), `frieren-backup-${Date.now()}.db`)
    try {
      db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`)
      await sock.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(file),
          fileName: `frieren-backup-${stamp()}.db`,
          mimetype: 'application/octet-stream',
          caption: 'Database backup. Reply to this file with .restore to bring it back.',
        },
        { quoted: m }
      )
    } catch (err) {
      console.error(err)
      await reply(mess.error).catch(console.error)
    } finally {
      fs.rmSync(file, { force: true })
    }
  },
}
