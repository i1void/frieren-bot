const { getPremium, setPremium } = require('../../lib/access')

module.exports = {
  usage: ['addprem'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply(`Tag/reply the user you want to make premium.`)
    const list = getPremium()
    const target = mentionedJid[0]
    if (!list.includes(target)) list.push(target)
    setPremium(list)
    reply(`⭐ @${target.split('@')[0]} is now premium.`, { mentions: [target] })
  },
}
