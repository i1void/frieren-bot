module.exports = {
  usage: ['revoke'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, reply }) => {
    const code = await sock.groupRevokeInvite(m.chat)
    reply(`✅ New group link: https://chat.whatsapp.com/${code}`)
  },
}
