const { stickerSetMeta } = require('../../lib/media')

module.exports = {
  usage: ['swm'],
  use: 'packname | author',
  category: 'converter',
  execute: async ({ sock, m, config, prefix, command, text, reply }) => {
    if (!m.quoted || m.quoted.mtype !== 'stickerMessage') {
      return reply(`Reply to a sticker with the caption ${prefix}${command} packname | author\nExample: ${prefix}${command} Frieren | Void`)
    }
    const [packname = '', author = ''] = text.split('|').map((v) => v.trim())
    if (!packname && !author) return reply(`Enter a pack name and/or author.\nExample: ${prefix}${command} Frieren | Void`)
    try {
      const buffer = await sock.downloadMediaMessage(m.quoted)
      const sticker = await stickerSetMeta(buffer, { packname, author })
      await sock.sendMessage(m.chat, { sticker }, { quoted: m })
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
