const { fetchJson } = require('../../lib/http')

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  category: 'downloader',
  description: 'Download TikTok video / slideshow',
  usage: '<tiktok link>',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, sleep, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a TikTok link.\nExample: ${prefix}tiktok https://vt.tiktok.com/xxxx`)
    if (!useLimit()) return
    let sent = 0 // media already delivered: no refund after that
    try {
      await reply(config.messages.wait)
      const json = await fetchJson(`${config.apiBase}/downloader/tiktok?url=${encodeURIComponent(text)}`)
      if (!json?.status || !json.result) {
        refundLimit()
        return reply(config.messages.error)
      }
      const { type, media, title } = json.result
      if (type === 'image' && media.images?.length) {
        for (let i = 0; i < media.images.length; i++) {
          await sock.sendMessage(
            m.chat,
            { image: { url: media.images[i] }, caption: `[Image ${i + 1}/${media.images.length}]` },
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
        await sock.sendMessage(m.chat, { video: { url: videoUrl }, caption: title || '' }, { quoted: m })
      }
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      reply(config.messages.error)
    }
  },
}
