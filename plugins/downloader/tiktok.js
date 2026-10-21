const { fetchJson } = require('../../lib/http')

module.exports = {
  usage: ['tt'],
  hidden: ['tiktok'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, sleep, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a TikTok link.\nExample: ${prefix}tiktok https://vt.tiktok.com/xxxx`)
    if (!useLimit()) return
    let sent = 0 // media already delivered: no refund after that
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const start = Date.now()
      const json = await fetchJson(`${config.apiBase}/downloader/tiktok?url=${encodeURIComponent(text)}`)
      if (!json?.status || !json.result) {
        refundLimit()
        return reply(config.messages.error)
      }
      const { type, media } = json.result
      const caption = `🍟 *Fetching* : ${Date.now() - start} ms`
      if (type === 'image' && media.images?.length) {
        for (let i = 0; i < media.images.length; i++) {
          await sock.sendMessage(
            m.chat,
            { image: { url: media.images[i] }, caption: `[Photo ${i + 1}]` },
            { quoted: m }
          )
          sent++
          await sleep(500)
        }
      } else {
        const videoUrl = media.video_hd || media.video
        if (!videoUrl) {
          refundLimit()
          return reply('Video not found / invalid link.')
        }
        await sock.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
      }
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      reply(config.messages.error)
    }
  },
}
