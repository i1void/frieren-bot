const { shorten } = require('../../lib/uploadFile')

module.exports = {
  usage: ['shorturl'],
  use: 'link',
  category: 'utilities',
  execute: async ({ config, prefix, text, reply }) => {
    if (!/^https?:\/\/\S+$/i.test(text)) return reply(`Example: ${prefix}shorturl https://example.com`)
    try {
      reply(`🔗 ${await shorten(text)}`)
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
