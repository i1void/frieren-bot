const { getPremium } = require('../../lib/access')

module.exports = {
  name: 'listprem',
  aliases: [],
  category: 'owner',
  description: 'List premium users',
  ownerOnly: true,
  execute: async ({ reply }) => {
    const list = getPremium()
    reply(list.length ? list.map((v, i) => `${i + 1}. @${v.split('@')[0]}`).join('\n') : 'No premium users yet.', {
      mentions: list,
    })
  },
}
