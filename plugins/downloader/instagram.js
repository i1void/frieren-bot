const { igdl } = require('ruhend-scraper')

module.exports = {
  usage: ['ig'],
  hidden: ['instagram', 'igdl'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, sleep, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter an Instagram link.\nExample: ${prefix}ig https://instagram.com/p/xxxx`)
    if (!useLimit()) return
    let sent = 0 // media already delivered: no refund after that
    try {
      await reply(config.messages.wait)
      const res = await igdl(text)
      const data = res.data || []
      if (!data.length) {
        refundLimit()
        return reply('Media not found / invalid link.')
      }
      for (const media of data) {
        const isVideo = /\.mp4($|\?)/i.test(media.url) || media.type === 'video'
        await sock.sendMessage(m.chat, isVideo ? { video: { url: media.url } } : { image: { url: media.url } }, {
          quoted: m,
        })
        sent++
        await sleep(500)
      }
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      reply(config.messages.error)
    }
  },
}
