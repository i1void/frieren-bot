const { fetchJson } = require('../../lib/http')

module.exports = {
  usage: ['fb'],
  hidden: ['facebook'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a Facebook link.\nExample: ${prefix}fb https://facebook.com/watch/xxxx`)
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
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
