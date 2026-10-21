const yts = require('yt-search')
const { download, describeError } = require('../../lib/ytdlp')

module.exports = {
  usage: ['play'],
  use: 'judul',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, text, reply, useLimit, refundLimit }) => {
    if (!text) return reply(`Example: ${prefix}play song title`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const video = (await yts(text)).videos[0]
      if (!video) {
        refundLimit()
        return reply('Song not found.')
      }
      const { buffer, title } = await download(video.url, 'audio')
      await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(describeError(err))
    }
  },
}
