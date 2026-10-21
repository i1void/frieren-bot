const fs = require('fs')
const path = require('path')

const QRIS_PATH = path.join(__dirname, '..', '..', 'storage', 'media', 'image', 'qris.png')

const CAPTION = `Support this bot ☕
Scan the QRIS above with any QRIS-supported e-wallet or banking app.

Or donate via Trakteer: https://trakteer.id/nodt`

module.exports = {
  usage: ['donate'],
  hidden: ['donasi'],
  category: 'others',
  execute: async ({ sock, m, reply }) => {
    // No qris.png yet: still send the text so the command never fails
    if (!fs.existsSync(QRIS_PATH)) return reply(CAPTION)
    await sock.sendMessage(m.chat, { image: fs.readFileSync(QRIS_PATH), caption: CAPTION }, { quoted: m })
  },
}
