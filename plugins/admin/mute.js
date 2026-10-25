const { isMuted, setMuted } = require('../../lib/group')

module.exports = {
  usage: ['mute'],
  use: 'on/off',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    const on = ['on', '1'].includes(mode)
    const off = ['off', '0'].includes(mode)
    if (!on && !off) {
      return reply(`Status: ${isMuted(m.chat) ? 'muted' : 'not muted'}\nExample: ${prefix}${command} on / ${prefix}${command} off`)
    }
    if (isMuted(m.chat) === on) return reply(`✅ Already ${on ? 'muted' : 'unmuted'}.`)
    setMuted(m.chat, on)
    reply(on ? `✅ Bot muted in this group. Use ${prefix}${command} off to turn it back on.` : '✅ Bot unmuted in this group.')
  },
}
