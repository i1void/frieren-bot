const { findYoutubeUrl, download, describeError } = require('../../lib/ytdlp')

module.exports = {
  usage: ['ytmp4'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const url = findYoutubeUrl(text)
    if (!url) return reply(`Enter a YouTube link.\nExample: ${prefix}${command} https://youtu.be/xxxx`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const { buffer, title } = await download(url, 'video')
      await sock.sendMessage(m.chat, { video: buffer, mimetype: 'video/mp4', caption: title }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(describeError(err))
    }
  },
}
