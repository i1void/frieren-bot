const { fromBuffer } = require('file-type')

module.exports = {
  // Each command name is also its endpoint: /images/<command>
  usage: ['bluearchive', 'waifu', 'neko', 'kitsune'],
  category: 'anime',
  limit: true,
  execute: async ({ sock, m, command, reply, useLimit, refundLimit }) => {
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const buffer = await Api.buffer(`/images/${command}`, {}, { timeout: 30000 })
      const type = buffer?.length ? await fromBuffer(buffer) : null
      if (!type?.mime?.startsWith('image/')) {
        refundLimit()
        return reply(mess.error)
      }
      await sock.sendMessage(m.chat, { image: buffer, caption: mess.done }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
