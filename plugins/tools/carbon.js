const { fetchJson } = require('../../lib/http')

module.exports = {
  name: 'carbon',
  aliases: [],
  category: 'tools',
  description: 'Turn code into an image',
  usage: '<code>',
  execute: async ({ sock, m, config, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}carbon console.log("hello")`)
    try {
      await reply(config.messages.wait)
      const json = await fetchJson(`https://meitang.xyz/carbon?text=${encodeURIComponent(text)}`)
      if (!json?.result) return reply(config.messages.error)
      await sock.sendMessage(m.chat, { image: { url: json.result } }, { quoted: m })
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
