const { getBanned, setBanned } = require('../../lib/access')

module.exports = {
  usage: ['ban'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply(`Tag/reply the user you want to ban.`)
    const list = getBanned()
    const target = mentionedJid[0]
    if (!list.includes(target)) list.push(target)
    setBanned(list)
    reply(`🚫 @${target.split('@')[0]} has been banned.`, { mentions: [target] })
  },
}
