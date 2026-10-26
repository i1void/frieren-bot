const { setLeftStatus } = require('../../lib/welcome')

module.exports = {
  usage: ['left'],
  use: 'on/off',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(mode)) return reply(`Example: ${prefix}${command} on / ${prefix}${command} off`)
    setLeftStatus(m.chat, mode === 'on')
    reply(mess.done)
  },
}
