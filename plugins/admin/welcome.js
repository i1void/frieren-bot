const { setWelcomeStatus } = require('../../lib/welcome')

module.exports = {
  usage: ['welcome'],
  use: 'on/off',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, config, prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(mode)) return reply(`Example: ${prefix}${command} on / ${prefix}${command} off`)
    setWelcomeStatus(m.chat, mode === 'on')
    reply(config.messages.done)
  },
}
