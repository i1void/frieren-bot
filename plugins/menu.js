const { runtime } = require('../lib/myfunc')
const { listPlugins } = require('../lib/pluginLoader')
const { getDisabledPlugins, getDisabledCommands, isPluginDisabled } = require('../lib/settings')
const { version } = require('../package.json')

// Sections are plugin categories. These two come first, these two last, any other one in between.
const FIRST = ['downloader', 'tools']
const LAST = ['group', 'owner']

module.exports = {
  usage: [],
  hidden: ['menu', 'help'],
  category: 'tools',
  execute: async ({ sock, config, prefix, reply, isOwner, isPremium }) => {
    const disabled = getDisabledPlugins()
    const offCommands = getDisabledCommands()
    const ownerNumber = config.owner[0].replace(/\D/g, '')
    const statusUser = isOwner ? 'Owner 🎴' : isPremium ? 'Premium 💎' : 'Free 😺'
    const botMode = sock.public ? 'public' : 'self'

    const sections = {}
    for (const plugin of listPlugins()) {
      if (!plugin.usage.length || isPluginDisabled(plugin, disabled)) continue
      for (const name of plugin.usage.filter((n) => !offCommands.includes(n))) (sections[plugin.category] ??= []).push(`${name}${plugin.use ? ' ' + plugin.use : ''}`)
    }

    const others = Object.keys(sections).filter((c) => !FIRST.includes(c) && !LAST.includes(c)).sort()
    const body = [...FIRST, ...others, ...LAST]
      .filter((category) => sections[category])
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
