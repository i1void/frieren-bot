import { fromBuffer } from '../../lib/fileType.js'

export default {
  usage: ['bluearchive', 'waifu', 'neko', 'kitsune'],
  category: 'images',
  limit: true,
  execute: async ({ sock, m, command, reply, useLimit, refundLimit }) => {
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const buffer = await Api.buffer(`/images/${command}`, {}, { timeout: 30000 })
      const type = buffer?.length ? await fromBuffer(buffer) : null
      if (!type?.mime?.startsWith('image/')) {
        refundLimit()
        return reply(mess.error).catch(console.error)
      }
      await sock.sendMessage(m.chat, { image: buffer, caption: mess.done }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
