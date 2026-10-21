const { listPlugins, getPlugin } = require('../../lib/pluginLoader')
const { getDisabledPlugins, setDisabledPlugins, isPluginDisabled } = require('../../lib/settings')

const PROTECTED = ['plugin'] // switching this one off would lock the owner out

module.exports = {
  name: 'plugin',
  aliases: ['plugins'],
  category: 'owner',
  description: 'List, enable or disable commands',
  ownerOnly: true,
  execute: async ({ prefix, command, args, reply }) => {
    const action = (args[0] || 'list').toLowerCase()

    if (action === 'list') {
      const disabled = getDisabledPlugins()
      const byCategory = {}
      for (const p of listPlugins()) (byCategory[p.category] ||= []).push(p)
      const blocks = Object.entries(byCategory).map(
        ([category, plugins]) =>
          `*${category}*\n${plugins.map((p) => `${isPluginDisabled(p, disabled) ? '🔴' : '🟢'} ${p.name}`).join('\n')}`
      )
      return reply(`${blocks.join('\n\n')}\n\nUse ${prefix}${command} off <cmd> / on <cmd>`)
    }

    const turnOn = ['on', 'enable'].includes(action)
    const turnOff = ['off', 'disable'].includes(action)
    if (!turnOn && !turnOff) return reply(`Example: ${prefix}${command} off tiktok`)

    const target = getPlugin(args[1] || '')
    if (!target) return reply(`Command "${args[1] || ''}" not found.`)
    if (turnOff && PROTECTED.includes(target.name)) return reply(`${prefix}${target.name} cannot be disabled.`)

    const disabled = getDisabledPlugins()
    const isDisabled = isPluginDisabled(target, disabled)
    if (turnOff && isDisabled) return reply(`${prefix}${target.name} is already disabled.`)
    if (turnOn && !isDisabled) return reply(`${prefix}${target.name} is already enabled.`)

    setDisabledPlugins(turnOff ? [...disabled, target.name] : disabled.filter((n) => n !== target.name && !target.aliases.includes(n)))
    reply(turnOff ? `🔴 ${prefix}${target.name} disabled.` : `🟢 ${prefix}${target.name} enabled.`)
  },
}
