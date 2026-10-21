const { getPremium, setPremium } = require('../../lib/access')

module.exports = {
  name: 'delprem',
  aliases: [],
  category: 'owner',
  description: 'Remove premium from a user',
  ownerOnly: true,
  execute: async ({ mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply(`Tag/reply the user you want to remove from premium.`)
    const target = mentionedJid[0]
    setPremium(getPremium().filter((v) => v !== target))
    reply(`✅ @${target.split('@')[0]} is no longer premium.`, { mentions: [target] })
  },
}
