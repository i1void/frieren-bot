import { runtime } from '../lib/utils.js'
import { getThumbnail } from '../lib/thumbnail.js'
import { listPlugins } from '../lib/pluginLoader.js'
import { getDisabledPlugins, getDisabledCommands, isPluginDisabled } from '../lib/settings.js'
import pkg from '../package.json' with { type: 'json' }
const { version } = pkg

const BULLET = '›'

const greeting = () => {
  const tz = process.env.TZ || 'Asia/Jakarta'
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date())) % 24
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default {
  usage: [],
  hidden: ['menu', 'help'],
  category: 'others',
  execute: async ({ sock, m, config, prefix, reply, isOwner, isPremium }) => {
    const disabled = getDisabledPlugins()
    const offCommands = getDisabledCommands()
    const statusUser = isOwner ? 'Owner 🎴' : isPremium ? 'Premium 💎' : 'Free 😺'
    const botMode = sock.public ? 'public' : 'self'
    const senderTag = m.sender.split('@')[0]

    const sections = {}
    for (const plugin of listPlugins()) {
      if (!plugin.usage.length || isPluginDisabled(plugin, disabled)) continue
      for (const name of plugin.usage.filter((n) => !offCommands.includes(n))) {
        const hint = typeof plugin.use === 'object' && plugin.use !== null ? plugin.use[name] : plugin.use
        ;(sections[plugin.category] ??= []).push(`${name}${hint ? ' ' + hint : ''}`)
      }
    }

    const body = Object.keys(sections)
      .sort()
      .flatMap((category, i) => [
        ...(i ? [''] : []),
        `⌗ *${category.toUpperCase()}*`,
        ...sections[category].sort().map((line) => `- ${prefix}${line}`),
      ])

    const info = [
      ['creator', config.ownerName],
      ['runtime', runtime(process.uptime())],
      ['mode', botMode],
      ['status', statusUser],
    ]
    const pad = Math.max(...info.map(([k]) => k.length))

    const text = [
      `${greeting()}, @${senderTag} 👋`,
      `I'm *${config.botName}*, an automated WhatsApp bot.`,
      '```',
      ...info.map(([k, v]) => `${BULLET} ${k.padEnd(pad)} : ${v}`),
      '```',
      ...body,
      '',
      `${BULLET} ${config.botName} · v${version}`,
    ].join('\n')

    const thumbnail = await getThumbnail(config).catch(() => null)
    if (!thumbnail) return reply(text, { mentions: [m.sender] })

    await sock.sendMessage(
      m.chat,
      {
        text,
        mentions: [m.sender],
        contextInfo: {
          externalAdReply: {
            title: config.botName,
            body: `v${version}`,
            thumbnail,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: pkg.homepage,
          },
        },
      },
      { quoted: m }
    )
  },
}
