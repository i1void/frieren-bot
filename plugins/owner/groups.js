const { listGroups, isMuted, getRent, formatLeft } = require('../../lib/group')

module.exports = {
  usage: ['groups'],
  use: '',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, prefix, reply }) => {
    const groups = await listGroups(sock)
    if (!groups.length) return reply('The bot is not in any group.')

    const blocks = groups.map((g, i) => {
      const rent = getRent(g.id)
      const stay = rent.stay ? 'FOREVER' : rent.expiresAt ? formatLeft(rent.expiresAt - Date.now()) : 'NOT SET'
      return [
        `*${i + 1}. ${g.subject}*`,
        `𖦹 member : *${g.participants.length}*`,
        `𖦹 stay : *${stay}*`,
        `𖦹 bot : *${isMuted(g.id) ? 'OFF (muted)' : 'ON'}*`,
      ].join('\n')
    })

    reply(
      [
        '━──「 *GROUP LIST* 」──━',
        '',
        blocks.join('\n\n'),
        '',
        `Total *${groups.length}* group(s). Use ${prefix}gc <number> to manage one.`,
      ].join('\n')
    )
  },
}
