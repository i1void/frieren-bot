const { fetchText } = require('../../lib/http')

module.exports = {
  usage: ['shorturl'],
  use: 'link',
  category: 'tools',
  execute: async ({ config, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}shorturl https://example.com`)
    try {
      const short = await fetchText(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`)
      reply(`🔗 ${short}`)
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
