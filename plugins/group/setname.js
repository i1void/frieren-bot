module.exports = {
  usage: ['setname'],
  use: 'teks',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}setname New Group Name`)
    await sock.groupUpdateSubject(m.chat, text)
    reply(config.messages.done)
  },
}
