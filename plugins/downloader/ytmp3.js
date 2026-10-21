const { findYoutubeUrl, download, describeError } = require('../../lib/ytdlp')

module.exports = {
  name: 'ytmp3',
  aliases: [],
  category: 'downloader',
  description: 'Download YouTube audio (mp3)',
  usage: '<link>',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const url = findYoutubeUrl(text)
    if (!url) return reply(`Enter a YouTube link.\nExample: ${prefix}${command} https://youtu.be/xxxx`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const { buffer, title } = await download(url, 'audio')
      await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(describeError(err))
    }
  },
}
