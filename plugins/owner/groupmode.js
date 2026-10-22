const { isGroupMode, setGroupMode } = require('../../lib/settings')

module.exports = {
  usage: ['groupmode'],
  use: 'on/off',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    const on = ['on', '1'].includes(mode)
    const off = ['off', '0'].includes(mode)
    if (!on && !off) {
      return reply(`Group mode: *${isGroupMode() ? 'on' : 'off'}*\nExample: ${prefix}${command} on / ${prefix}${command} off`)
    }
    if (isGroupMode() === on) return reply(`✅ Group mode was already ${on ? 'on' : 'off'}.`)
    setGroupMode(on)
    reply(
      on
        ? '✅ Group mode on. In private chat only premium users and the owner can use the bot.'
        : '✅ Group mode off. Everyone can use the bot in private chat.'
    )
  },
}
