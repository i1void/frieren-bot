const { fromBuffer } = require('file-type')

module.exports = {
  usage: ['bluearchive'],
  hidden: ['ba'],
  category: 'anime',
  limit: true,
  execute: async ({ sock, m, reply, useLimit, refundLimit }) => {
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: 'ðŸ•’', key: m.key } }).catch(() => {})
      const buffer = await Api.buffer('/images/bluearkep', {}, { timeout: 30000 })
      const type = buffer?.length ? await fromBuffer(buffer) : null
      if (!type?.mime?.startsWith('image/')) {
        refundLimit()
        return reply(mess.error)
      }
      await sock.sendMessage(m.chat, { image: buffer, caption: 'ðŸŽ´ Blue Archive' }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
