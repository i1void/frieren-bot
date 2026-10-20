const { fetchJson } = require('../../lib/http')

module.exports = {
  name: 'facebook',
  aliases: ['fb'],
  category: 'downloader',
  description: 'Download Facebook video',
  usage: '<facebook link>',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a Facebook link.\nExample: ${prefix}fb https://facebook.com/watch/xxxx`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const json = await fetchJson(`${config.apiBase}/downloader/facebook?url=${encodeURIComponent(text)}`)
      if (!json?.status || !json.result) {
        refundLimit()
        return reply(config.messages.error)
      }
      const videoUrl = json.result.media?.video || json.result.media?.video_sd
      if (!videoUrl) {
        refundLimit()
        return reply('Video not found / invalid link.')
      }
      await sock.sendMessage(m.chat, { video: { url: videoUrl }, caption: json.result.title || '' }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
