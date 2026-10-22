const { addPremium, removePremium, formatExpiry, getBanned, setBanned } = require('../../lib/access')

const MAX_DAYS = 3650
const UNIT_IN_DAYS = { d: 1, h: 1 / 24, m: 1 / 1440 }

// User management for the owner: +prem / -prem (addprem / delprem still work), ban, unban.
module.exports = {
  usage: ['+prem', '-prem', 'ban', 'unban'],
  hidden: ['addprem', 'delprem'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ config, prefix, command, args, mentionedJid, reply }) => {
    const target = mentionedJid[0]
    const tag = target && `@${target.split('@')[0]}`
    const mention = { mentions: [target] }

    switch (command) {
      case 'ban': {
        if (!target) return reply('Tag/reply the user you want to ban.')
        const list = getBanned()
        if (!list.includes(target)) list.push(target)
        setBanned(list)
        return reply(`🚫 ${tag} has been banned.`, mention)
      }

      case 'unban': {
        if (!target) return reply('Tag/reply the user you want to unban.')
        setBanned(getBanned().filter((v) => v !== target))
        return reply(`✅ ${tag} has been unbanned.`, mention)
      }

      case '-prem':
      case 'delprem': {
        if (!target) return reply('Tag/reply the user you want to remove from premium.')
        return reply(removePremium(target) ? `✅ ${tag} is no longer premium.` : `${tag} was not a premium user.`, mention)
      }

      default: {
        // +prem / addprem. The last argument is the duration: 30d (days), 12h (hours), 90m (minutes), or just a
        // number for days. At most 7 digits, so a typo like 99999 is rejected, not read as "permanent". The router
        // only reads 8+ digit arguments as a phone number, so the two never clash. No duration = permanent.
        const last = (args[args.length - 1] || '').toLowerCase()
        const match = last.match(/^(\d{1,7})([dhm])?$/)
        const days = match ? Number(match[1]) * UNIT_IN_DAYS[match[2] || 'd'] : null

        if (!target) {
          return reply(
            `Tag/reply the user, or give a number.\n` +
              `Example: ${prefix}${command} 6281234567890 30d\n` +
              `${prefix}${command} @user 12h\n` +
              `Duration: d = days, h = hours, m = minutes. No duration = permanent.\n` +
              `Remove: ${prefix}-prem @user`
          )
        }
        if (match && (Number(match[1]) < 1 || days > MAX_DAYS)) {
          return reply(`Duration must be at least 1 and at most ${MAX_DAYS} days.`)
        }

        const expiresAt = addPremium(target, days)
        const note = days !== null && expiresAt === null ? '\nThis user is already permanent, so no end date was set.' : ''
        return reply(`⭐ ${tag} is premium.\nValid until: ${formatExpiry(expiresAt, config)}${note}`, mention)
      }
    }
  },
}
