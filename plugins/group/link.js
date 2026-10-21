module.exports = {
  name: 'link',
  aliases: ['linkgc'],
  category: 'group',
  description: 'Get the group invite link',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, reply }) => {
    const code = await sock.groupInviteCode(m.chat)
    reply(`🔗 https://chat.whatsapp.com/${code}`)
  },
}
