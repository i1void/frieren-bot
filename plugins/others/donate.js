const QRIS_URL = 'https://i.postimg.cc/brzd8FR5/qris.png'

const CAPTION = `Support this bot ☕
Scan the QRIS above with any QRIS-supported e-wallet or banking app.

Or donate via Trakteer: https://trakteer.id/nodt`

export default {
  usage: ['donate'],
  hidden: ['donasi'],
  category: 'others',
  execute: async ({ sock, m, reply }) => {
    try {
      await sock.sendMessage(m.chat, { image: { url: QRIS_URL }, caption: CAPTION }, { quoted: m })
    } catch (err) {
      console.error('[donate] could not send the QRIS image:', err.message)
      await reply(CAPTION)
    }
  },
}
