module.exports = {
  usage: ['join'],
  use: 'link',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}join https://chat.whatsapp.com/xxxx`)
    try {
      const code = text.split('https://chat.whatsapp.com/')[1]
      await sock.groupAcceptInvite(code)
      reply('✅ Successfully joined the group.')
    } catch (err) {
      console.error(err)
      reply('❌ Failed to join, the link may be invalid.')
    }
  },
}
