const { fromBuffer } = require('file-type')
const { fetchBuffer } = require('../../lib/http')

module.exports = {
  usage: ['brat'],
  use: 'text',
  category: 'tools',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const input = text || m.quoted?.text || ''
    if (!input) return reply(`Enter some text.\nExample: ${prefix}${command} Hai goodbye`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const image = await fetchBuffer(`${config.apiBase}/generate/brat?text=${encodeURIComponent(input)}`)
      const type = await fromBuffer(image)
      if (!type || !type.mime.startsWith('image/')) {
        refundLimit()
        return reply(config.messages.error)
      }
      await sock.sendImageAsSticker(m.chat, image, m, { packname: config.packName, author: config.authorName })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
