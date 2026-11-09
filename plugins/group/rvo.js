import { revealMedia } from '../../lib/viewonce.js'

export default {
  usage: ['rvo'],
  use: 'reply viewonce',
  category: 'group',
  execute: async ({ sock, m, reply }) => {
    const q = m.quoted
    if (!q) return reply('❌ Reply to a view-once message to use this command.')

    // view-once messages arrive wrapped ({ message: { imageMessage } }), plain ones are the media itself
    const media = q.message ? q.message[Object.keys(q.message)[0]] : q

    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const done = await revealMedia(sock, m.chat, media, m)
      if (!done) await reply('❌ Reply to a view-once photo, video, or voice note.')
    } catch (err) {
      console.error(err)
      await reply("❌ Couldn't open it. The media may have expired or already been opened.")
    }
  },
}
