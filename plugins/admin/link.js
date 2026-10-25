module.exports = {
  usage: ['link'],
  hidden: ['linkgc'],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, reply }) => {
    const code = await sock.groupInviteCode(m.chat)
    reply(`🔗 https://chat.whatsapp.com/${code}`)
  },
}
