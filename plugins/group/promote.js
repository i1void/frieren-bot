module.exports = {
  name: 'promote',
  aliases: [],
  category: 'group',
  description: 'Make a member a group admin',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply('Tag/reply the user you want to promote.')
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, 'promote')
    reply(config.messages.done)
  },
}
