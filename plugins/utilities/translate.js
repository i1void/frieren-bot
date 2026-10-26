const { fetchJson } = require('../../lib/http')

// Google's public translate endpoint (no key). Language codes: id, en, ja, ko, ar, es, ...
const LANG = /^[a-z]{2,3}(-[a-z]{2,4})?$/i

module.exports = {
  usage: ['translate'],
  hidden: ['tr'],
  use: '<lang> text',
  category: 'utilities',
  limit: true,
  execute: async ({ m, prefix, command, args, reply, useLimit, refundLimit }) => {
    const first = args[0] || ''
    const hasLang = LANG.test(first) && (args.length > 1 || m.quoted?.text)
    const lang = hasLang ? first.toLowerCase() : 'id'
    const input = (hasLang ? args.slice(1).join(' ') : args.join(' ')) || m.quoted?.text || ''
    if (!input) return reply(`Example: ${prefix}${command} en selamat pagi\nOr reply to a message: ${prefix}${command} ja\nDefault target language: id`)
    if (input.length > 2000) return reply('Max 2000 characters.')
    if (!useLimit()) return
    try {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto' +
        `&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(input)}`
      const json = await fetchJson(url)
      const result = (json?.[0] || []).map((part) => part?.[0] || '').join('')
      if (!result) {
        refundLimit()
        return reply(mess.error)
      }
      reply(`🌐 *${json[2] || 'auto'} → ${lang}*\n\n${result}`)
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
