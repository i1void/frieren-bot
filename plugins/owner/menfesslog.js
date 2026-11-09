import { getSession } from '../../lib/menfess.js'

export default {
  usage: ['menfesslog'],
  use: 'code',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ prefix, command, args, reply }) => {
    if (!args[0]) return reply(`Example: ${prefix}${command} A1B2C3`)
    const s = getSession(args[0])
    if (!s) return reply('Code not found.')
    const num = (jid) => jid.split('@')[0]
    reply(
      `*MENFESS #${s.code}*\n` +
        `• Sender: wa.me/${num(s.sender)}\n` +
        `• Target: wa.me/${num(s.target)}\n` +
        `• Alias: ${s.alias}\n` +
        `• Time: ${new Date(s.created_at).toISOString()}\n\n` +
        `Use ${prefix}ban @user to block the sender.`
    )
  },
}
