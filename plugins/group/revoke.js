module.exports = {
  name: 'revoke',
  aliases: [],
  category: 'group',
  description: 'Reset the group invite link',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, reply }) => {
    const code = await sock.groupRevokeInvite(m.chat)
    reply(`✅ New group link: https://chat.whatsapp.com/${code}`)
  },
}
