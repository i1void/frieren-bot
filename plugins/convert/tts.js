const { fetchBuffer } = require('../../lib/http')
const { convertToOpus } = require('../../lib/convert')

const LANG = /^[a-z]{2,3}(-[a-z]{2,4})?$/i
const MAX_CHARS = 200 // Google TTS refuses longer text in one request

module.exports = {
  usage: ['tts'],
  use: '<lang> text',
  category: 'converter',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, args, reply, useLimit, refundLimit }) => {
    const hasLang = LANG.test(args[0] || '') && (args.length > 1 || m.quoted?.text)
    const lang = hasLang ? args[0].toLowerCase() : 'id'
    const input = (hasLang ? args.slice(1).join(' ') : args.join(' ')) || m.quoted?.text || ''
    if (!input) return reply(`Example: ${prefix}${command} halo semuanya\nOther language: ${prefix}${command} en good morning\nDefault language: id`)
    if (input.length > MAX_CHARS) return reply(`Max ${MAX_CHARS} characters.`)
    if (!useLimit()) return
    try {
      const mp3 = await fetchBuffer(
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(input)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      const audio = await convertToOpus(mp3)
      await sock.sendMessage(m.chat, { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
