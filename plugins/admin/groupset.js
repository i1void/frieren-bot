// Change the group name or description (group admins; the bot must be an admin too).
module.exports = {
  usage: ['setname', 'setdesc'],
  use: 'teks',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, prefix, command, text, reply }) => {
    if (command === 'setname') {
      if (!text) return reply(`Example: ${prefix}setname New Group Name`)
      await sock.groupUpdateSubject(m.chat, text)
    } else {
      if (!text) return reply(`Example: ${prefix}setdesc New group description`)
      await sock.groupUpdateDescription(m.chat, text)
    }
    reply(config.messages.done)
  },
}
