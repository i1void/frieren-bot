const { getPlugin } = require('../../lib/pluginLoader')
const { getDisabledCommands, setCommandDisabled } = require('../../lib/settings')

// Never switched off, or the owner could lock themselves out of turning things back on.
const PROTECTED = ['plugin', 'disable']

// Switches off a single command while the other commands of the same plugin keep working.
// (.plugin off <cmd> switches off the whole plugin.)
module.exports = {
  usage: ['disable', 'enable'],
  use: '<command>',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ prefix, command, args, reply }) => {
    const name = (args[0] || '').toLowerCase().replace(/^[^\w+-]+/, '')
    const off = getDisabledCommands()

    if (!name) {
      const list = off.length ? `\n\nDisabled now:\n${off.map((c) => `🔴 ${prefix}${c}`).join('\n')}` : ''
      return reply(`Example: ${prefix}${command} tiktok${list}`)
    }

    const target = getPlugin(name)
    if (!target) return reply(`Command "${name}" not found.`)
    if (PROTECTED.includes(target.name)) return reply(`${prefix}${name} cannot be disabled.`)

    const isOff = off.includes(name)
    if (command === 'disable') {
      if (isOff) return reply(`${prefix}${name} is already disabled.`)
      setCommandDisabled(name, true)
      return reply(`🔴 ${prefix}${name} disabled.`)
    }
    if (!isOff) return reply(`${prefix}${name} is already enabled.`)
    setCommandDisabled(name, false)
    reply(`🟢 ${prefix}${name} enabled.`)
  },
}
