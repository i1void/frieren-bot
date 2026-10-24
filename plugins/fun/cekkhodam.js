const { fetchJson } = require('../../lib/http')

module.exports = {
  usage: ['cekkhodam'],
  hidden: ['khodam'],
  use: 'name',
  category: 'fun',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    // No name given: use the sender's WhatsApp name.
    const name = (text || m.pushName || '').replace(/\s+/g, ' ').trim().slice(0, 30)
    if (!name) return reply(`Enter a name.\nExample: ${prefix}${command} Hi`)
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🔮', key: m.key } }).catch(() => {})
      const json = await fetchJson(`${config.apiBase}/fun/cekkhodam?name=${encodeURIComponent(name)}`)
      const khodam = json?.result?.khodam
      if (!json?.status || !khodam) {
        refundLimit()
        return reply(config.messages.error)
      }
      reply(`Khodam ${json.result.name || name} adalah : ${khodam}`)
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
