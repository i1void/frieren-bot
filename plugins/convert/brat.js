const { fromBuffer } = require('file-type')

module.exports = {
  usage: ['brat'],
  use: 'text',
  category: 'converter',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const input = text || m.quoted?.text || ''
    if (!input) return reply(`Enter some text.\nExample: ${prefix}${command} Hai goodbye`)
    if (!useLimit()) return
    try {
      await reply(mess.wait)
      const image = await Api.buffer('/generate/brat', { text: input })
      const type = await fromBuffer(image)
      if (!type || !type.mime.startsWith('image/')) {
        refundLimit()
        return reply(mess.error).catch(console.error)
      }
      await sock.sendImageAsSticker(m.chat, image, m, { packname: config.packName, author: config.authorName })
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
