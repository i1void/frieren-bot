const { fetchJson, fetchBuffer } = require('../../lib/http')

// Emoji Kitchen through the Tenor API. Needs a free Tenor/Google API key in config.tenorKey.
const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu

module.exports = {
  usage: ['emojimix'],
  use: '😀+😍',
  category: 'converter',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    if (!config.tenorKey) return reply('emojimix is not set up: the owner needs to put a Tenor API key in config.js (tenorKey).')
    const emojis = text.match(EMOJI) || []
    if (emojis.length !== 2) return reply(`Send two emojis.\nExample: ${prefix}${command} 😀+😍`)
    if (!useLimit()) return
    try {
      const url =
        `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(config.tenorKey)}` +
        `&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5` +
        `&q=${encodeURIComponent(emojis[0] + '_' + emojis[1])}`
      const json = await fetchJson(url)
      const image = json?.results?.[0]?.media_formats?.png_transparent?.url
      if (!image) {
        refundLimit()
        return reply("These two emojis can't be mixed.")
      }
      await sock.sendImageAsSticker(m.chat, await fetchBuffer(image), m, {
        packname: config.packName,
        author: config.authorName,
      })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
