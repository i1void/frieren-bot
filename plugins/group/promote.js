module.exports = {
  usage: ['promote'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply('Tag/reply the user you want to promote.')
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, 'promote')
    reply(config.messages.done)
  },
}
