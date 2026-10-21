module.exports = {
  usage: ['kick'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply('Tag/reply the user you want to remove.')
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, 'remove')
    reply(config.messages.done)
  },
}
