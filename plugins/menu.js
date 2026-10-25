const { runtime } = require('../lib/myfunc')
const { listPlugins } = require('../lib/pluginLoader')
const { getDisabledPlugins, getDisabledCommands, isPluginDisabled } = require('../lib/settings')
const { version } = require('../package.json')

module.exports = {
  usage: [],
  hidden: ['menu', 'help'],
  category: 'others',
  execute: async ({ sock, config, prefix, reply, isOwner, isPremium }) => {
    const disabled = getDisabledPlugins()
    const offCommands = getDisabledCommands()
    const ownerNumber = config.owner[0].replace(/\D/g, '')
    const statusUser = isOwner ? 'Owner 🎴' : isPremium ? 'Premium 💎' : 'Free 😺'
    const botMode = sock.public ? 'public' : 'self'

    const sections = {}
    for (const plugin of listPlugins()) {
      if (!plugin.usage.length || isPluginDisabled(plugin, disabled)) continue
      for (const name of plugin.usage.filter((n) => !offCommands.includes(n))) {
        // "use" is either one string for every command, or an object { command: 'hint' }
        const hint = typeof plugin.use === 'object' && plugin.use !== null ? plugin.use[name] : plugin.use
        ;(sections[plugin.category] ??= []).push(`${name}${hint ? ' ' + hint : ''}`)
      }
    }

    // Sections are plugin categories, sorted A-Z.
    const body = Object.keys(sections)
      .sort()
      .flatMap((category) => ['', `⌗ *${category.toUpperCase()}*`, ...sections[category].sort().map((line) => `- ${prefix}${line}`)])

    const text = [
      '*`「 INFO BOT 」`*',
      `𖦹 creator : *@${ownerNumber}*`,
      `𖦹 runtime : *${runtime(process.uptime())}*`,
      `𖦹 mode : *${botMode}*`,
      `𖦹 status : *${statusUser}*`,
      '',
      '*`「 LIST MENU 」`*',
      ...body,
      '',
      `› ${config.botName} · v${version}`,
    ].join('\n')

    reply(text, { mentions: [`${ownerNumber}@s.whatsapp.net`] })
  },
}
