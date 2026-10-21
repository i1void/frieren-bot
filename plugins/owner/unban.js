const { getBanned, setBanned } = require('../../lib/access')

module.exports = {
  usage: ['unban'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply(`Tag/reply the user you want to unban.`)
    const target = mentionedJid[0]
    setBanned(getBanned().filter((v) => v !== target))
    reply(`✅ @${target.split('@')[0]} has been unbanned.`, { mentions: [target] })
  },
}
