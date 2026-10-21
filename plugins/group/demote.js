module.exports = {
  name: 'demote',
  aliases: [],
  category: 'group',
  description: 'Remove the admin role from a member',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, mentionedJid, reply }) => {
    if (!mentionedJid.length) return reply('Tag/reply the user you want to demote.')
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, 'demote')
    reply(config.messages.done)
  },
}
