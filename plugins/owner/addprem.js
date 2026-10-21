const { addPremium, formatExpiry } = require('../../lib/access')

const MAX_DAYS = 3650

module.exports = {
  usage: ['addprem'],
  use: 'nomor hari',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ config, prefix, command, args, mentionedJid, reply }) => {
    // A last argument of up to 7 digits is the number of days (so a typo like 99999 is rejected, not read as
    // "permanent"). The router only reads 8+ digit arguments as a phone number, so the two never clash.
    const last = args[args.length - 1] || ''
    const hasDays = /^\d{1,7}$/.test(last)
    const days = hasDays ? Number(last) : null

    if (!mentionedJid.length) {
      return reply(`Tag/reply the user, or give a number.\nExample: ${prefix}${command} 6281234567890 30\n(no days = permanent)`)
    }
    if (hasDays && (days < 1 || days > MAX_DAYS)) return reply(`Days must be between 1 and ${MAX_DAYS}.`)

    const target = mentionedJid[0]
    const expiresAt = addPremium(target, days)
    const note = days !== null && expiresAt === null ? '\nThis user is already permanent, so no end date was set.' : ''
    reply(`⭐ @${target.split('@')[0]} is premium.\nValid until: ${formatExpiry(expiresAt, config)}${note}`, { mentions: [target] })
  },
}
