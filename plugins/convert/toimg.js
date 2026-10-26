const { convertWebpToPng, isAnimatedWebp } = require('../../lib/convert')

module.exports = {
  usage: ['toimg'],
  category: 'converter',
  execute: async ({ sock, m, prefix, reply }) => {
    if (!m.quoted || m.quoted.mtype !== 'stickerMessage') return reply(`Reply to a sticker with the caption ${prefix}toimg`)
    try {
      const buffer = await sock.downloadMediaMessage(m.quoted)
      if (isAnimatedWebp(buffer)) return reply("Animated stickers can't be converted to an image.")
      const image = await convertWebpToPng(buffer)
      await sock.sendMessage(m.chat, { image }, { quoted: m })
    } catch (err) {
      console.error(err)
      reply(mess.error)
    }
  },
}
