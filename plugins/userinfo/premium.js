const { listPremium, formatExpiry } = require('../../lib/access')

// Price list shown to users. Edit here.
const PLANS = ['7 hari - Rp 5.000', '30 hari - Rp 15.000']
const PAYMENT = 'QRIS / DANA'

module.exports = {
  usage: ['premium'],
  category: 'user',
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
        '*Perks*',
        '𖦹 Unlimited limit',
        '𖦹 Private chat access (when group mode is on)',
        '',
        '*Plans*',
        ...PLANS.map((plan) => `𖦹 ${plan}`),
        '',
        '*Payment*',
        `𖦹 ${PAYMENT}`,
        '',
        `To upgrade, contact the owner: *${prefix}owner*`,
      ].join('\n')
    )
  },
}
