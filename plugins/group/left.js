const { setLeftStatus } = require('../../lib/welcome')

module.exports = {
  usage: ['left'],
  use: 'on/off',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, config, prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(mode)) return reply(`Example: ${prefix}${command} on / ${prefix}${command} off`)
    setLeftStatus(m.chat, mode === 'on')
    reply(config.messages.done)
  },
}
