module.exports = {
  name: 'add',
  aliases: [],
  category: 'group',
  description: 'Add a member by number',
  usage: '<nomor>',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}add 6281234567890`)
    const jid = text.replace(/\D/g, '') + '@s.whatsapp.net'
    await sock.groupParticipantsUpdate(m.chat, [jid], 'add')
    reply(config.messages.done)
  },
}
