import { shorten } from '../../lib/uploadFile.js'

export default {
  usage: ['shorturl'],
  use: 'link',
  category: 'utilities',
  execute: async ({ prefix, text, reply }) => {
    if (!/^https?:\/\/\S+$/i.test(text)) return reply(`Example: ${prefix}shorturl https://example.com`)
    try {
      reply(`🔗 ${await shorten(text)}`)
    } catch (err) {
      console.error(err)
      await reply(mess.error).catch(console.error)
    }
  },
}
