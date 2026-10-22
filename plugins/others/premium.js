const { listPremium, formatExpiry } = require('../../lib/access')

// Price list shown to users. Edit here.
const PLANS = ['7 hari - Rp 5.000', '30 hari - Rp 15.000']
const PAYMENT = 'QRIS / DANA'

module.exports = {
  usage: ['premium'],
  category: 'others',
  execute: async ({ config, prefix, m, isOwner, isPremium, reply }) => {
    if (isOwner) return reply('👑 You are the owner, so everything is unlocked.')

    if (isPremium) {
      const mine = listPremium().find((v) => v.jid === m.sender)
      return reply(`⭐ You are premium.\nValid until: ${formatExpiry(mine?.expiresAt ?? null, config)}`)
    }

    reply(
      [
        '━──「 *PREMIUM* 」──━',
        '',
        '✨ *Perks*',
        '𖦹 unlimited command limit',
        '𖦹 use the bot in private chat even when group mode is on',
        '',
        '💵 *Plans*',
        ...PLANS.map((plan) => `𖦹 ${plan}`),
        '',
        `💳 *Payment* : ${PAYMENT}`,
        '',
        `Contact the owner with *${prefix}owner* to upgrade.`,
      ].join('\n')
    )
  },
}
