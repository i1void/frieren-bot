const { getTimezone } = require('../../lib/db')

module.exports = {
  usage: ['limit'],
  category: 'others',
  execute: async ({ config, prefix, user, isPremium, reply }) => {
    if (isPremium) return reply('🍟 Your limit : *unlimited* (premium)')

    const resetNote = `Your limit resets every day at 00:00 (${getTimezone(config)}).`
    if (user.limit < 1) {
      return reply(`❌ Your limit has run out.\n${resetNote}\n\nNeed more? Send *${prefix}premium* to upgrade.`)
    }
    reply(`🍟 Your limit : *${user.limit}*\n${resetNote}\n\nNeed more? Send *${prefix}premium* to upgrade.`)
  },
}
