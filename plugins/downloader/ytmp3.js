const { findYoutubeUrl, getInfo, download, describeError, cleanTitle } = require('../../lib/youtube')

module.exports = {
  usage: ['ytmp3'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const url = findYoutubeUrl(text)
    if (!url) return reply(`Enter a YouTube link.\nExample: ${prefix}${command} https://youtu.be/xxxx`)
    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const info = await getInfo(url, config)
      const { buffer, mimetype, ext } = await download(info, 'audio')
      await sock.sendMessage(m.chat, { audio: buffer, mimetype, fileName: `${cleanTitle(info.title)}.${ext}` }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(describeError(err, config))
    }
  },
}
