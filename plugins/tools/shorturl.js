const { fetchText } = require('../../lib/http')

module.exports = {
  name: 'shorturl',
  aliases: [],
  category: 'tools',
  description: 'Shorten a link',
  usage: '<link>',
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
