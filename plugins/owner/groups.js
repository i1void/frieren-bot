const { listGroups } = require('../../lib/groups')
const { isMuted } = require('../../lib/mute')

module.exports = {
  usage: ['groups'],
  use: '',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, prefix, reply }) => {
    const groups = await listGroups(sock)
    if (!groups.length) return reply('The bot is not in any group.')
    const lines = groups.map((g, i) => `${i + 1}. ${g.subject} (${g.participants.length}) ${isMuted(g.id) ? '🔇' : ''}`.trim())
    reply(`*Groups (${groups.length})*\n\n${lines.join('\n')}\n\n🔇 = muted\nUse ${prefix}gc <number> to manage a group.`)
  },
}
