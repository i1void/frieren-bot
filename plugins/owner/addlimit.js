const { addLimit } = require('../../lib/db')

module.exports = {
  usage: ['addlimit'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ config, prefix, args, mentionedJid, reply }) => {
    if (!mentionedJid.length || !args[args.length - 1]?.match(/^\d+$/))
      return reply(`Example: ${prefix}addlimit @user 50`)
    const amount = parseInt(args[args.length - 1], 10)
    const target = mentionedJid[0]
    addLimit(target, amount, config)
    reply(`✅ @${target.split('@')[0]}'s limit increased by ${amount}.`, { mentions: [target] })
  },
}
