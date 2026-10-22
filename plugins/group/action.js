// Member actions for group admins: add, kick, promote, demote. The bot must be an admin too.
const ACTIONS = {
  kick: { update: 'remove', ask: 'Tag/reply the user you want to remove.' },
  promote: { update: 'promote', ask: 'Tag/reply the user you want to promote.' },
  demote: { update: 'demote', ask: 'Tag/reply the user you want to demote.' },
}

module.exports = {
  usage: ['add', 'kick', 'promote', 'demote'],
  use: 'mention / reply / nomor',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, config, prefix, command, text, mentionedJid, reply }) => {
    if (command === 'add') {
      if (!text) return reply(`Example: ${prefix}add 6281234567890`)
      const jid = text.replace(/\D/g, '') + '@s.whatsapp.net'
      await sock.groupParticipantsUpdate(m.chat, [jid], 'add')
      return reply(config.messages.done)
    }

    const action = ACTIONS[command]
    if (!mentionedJid.length) return reply(action.ask)
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, action.update)
    reply(config.messages.done)
  },
}
