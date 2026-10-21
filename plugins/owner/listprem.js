const { listPremium, formatExpiry } = require('../../lib/access')

module.exports = {
  usage: ['listprem'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ config, reply }) => {
    const list = listPremium()
    const lines = list.map((v, i) => `${i + 1}. @${v.jid.split('@')[0]} - ${formatExpiry(v.expiresAt, config)}`)
    reply(lines.length ? lines.join('\n') : 'No premium users yet.', { mentions: list.map((v) => v.jid) })
  },
}
