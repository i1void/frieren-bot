const { removePremium } = require('../../lib/access')

module.exports = {
  usage: ['delprem'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply(`Tag/reply the user you want to remove from premium.`)
    const target = mentionedJid[0]
    removePremium(target)
    reply(`✅ @${target.split('@')[0]} is no longer premium.`, { mentions: [target] })
  },
}
