const { fetchJson } = require('../../lib/http')

module.exports = {
  usage: ['gemini'],
  hidden: ['ai'],
  use: 'question',
  category: 'ai',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    if (!text) return reply(`Ask something.\nExample: ${prefix}${command} Hi`)
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await fetchJson(`${config.apiBase}/ai/gemini?text=${encodeURIComponent(text)}`, {
        timeout: 60000, // AI answers can be slow
      })
      const answer = json?.result?.response
      if (!json?.status || !answer) {
        refundLimit()
        return reply(config.messages.error)
      }
      reply(answer)
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
