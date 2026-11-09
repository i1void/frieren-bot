import { getPlugin } from '../../lib/pluginLoader.js'
import { getDisabledCommands, setCommandDisabled } from '../../lib/settings.js'

const PROTECTED = ['plugin', 'disable']

export default {
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
