import { runtime } from '../lib/utils.js'
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '../lib/baileys.js'
import { getThumbnail } from '../lib/thumbnail.js'
import { listPlugins } from '../lib/pluginLoader.js'
import { getDisabledPlugins, getDisabledCommands, isPluginDisabled, getMenuStyle } from '../lib/settings.js'
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
  execute: async ({ sock, m, config, prefix, args, reply, isOwner, isPremium }) => {
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

    const categories = Object.keys(sections).sort()
    const style = getMenuStyle()

    const wanted = args?.[0]?.toLowerCase()
    if (style !== 1 && wanted) {
      const category = categories.find((c) => c.toLowerCase() === wanted)
      if (!category) return reply(`Category not found.\nExample: ${prefix}menu ${categories[0] || 'others'}`)
      return reply([`⌗ *${category.toUpperCase()}*`, ...sections[category].sort().map((line) => `- ${prefix}${line}`)].join('\n'))
    }

    const fullList = categories.flatMap((category, i) => [
      ...(i ? [''] : []),
      `⌗ *${category.toUpperCase()}*`,
      ...sections[category].sort().map((line) => `- ${prefix}${line}`),
    ])
    const categoryList = categories.map((category) => `- ${prefix}menu ${category}`)

    const body = style === 1 ? fullList : style === 2 ? ['', '⌗ *CATEGORIES*', ...categoryList] : []
    const plainBody = style === 1 ? fullList : ['', '⌗ *CATEGORIES*', ...categoryList]

    const info = [
      ['creator', config.ownerName],
      ['runtime', runtime(process.uptime())],
      ['mode', botMode],
      ['status', statusUser],
    ]

    const head = [
      `${greeting()}, @${senderTag} 👋`,
      `I'm *${config.botName}*, an automated WhatsApp bot.`,
      '',
      ...info.map(([k, v]) => `${BULLET} ${k}: ${v}`),
    ]
    const text = [...head, ...body].join('\n')
    // the interactive menu already has the grey footer, so this line is only for the plain-text fallback
    const plain = `${[...head, ...plainBody].join('\n')}\n\n${BULLET} ${config.botName} · v${version}`

    const thumbnail = await getThumbnail(config).catch(() => null)
    if (!thumbnail) return reply(plain, { mentions: [m.sender] })

    const tapLink = config.menuLink || 'https://github.com/i1void/frieren-bot'

    try {
      const { imageMessage } = await prepareWAMessageMedia({ image: thumbnail }, { upload: sock.waUploadToServer })

      const msg = generateWAMessageFromContent(
        m.chat,
        {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create(
              config.menuHeader === 'image'
                ? // plain image header: tapping it opens the normal image viewer
                  { title: config.botName, subtitle: '', hasMediaAttachment: true, imageMessage }
                : // product header: the image is shown as a product photo
                  {
                    title: config.botName,
                    subtitle: '',
                    hasMediaAttachment: true,
                    productMessage: {
                      product: {
                        productImage: imageMessage,
                        title: config.botName,
                        description: '',
                        currencyCode: '',
                        retailerId: '',
                        url: tapLink,
                        productImageCount: 1,
                      },
                      businessOwnerJid: '0@s.whatsapp.net',
                    },
                  }
            ),
            body: { text },
            footer: { text: `${config.botName} · v${version}` },
            nativeFlowMessage: {
              messageParamsJson: JSON.stringify({
                tap_target_configuration: {
                  title: config.botName,
                  description: `v${version}`,
                  canonical_url: tapLink,
                  domain: new URL(tapLink).origin,
                  button_index: 0,
                },
              }),
              buttons:
                style === 3
                  ? [
                      {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                          title: 'Tap Here!',
                          sections: [
                            {
                              title: 'Categories',
                              rows: categories.map((category) => ({
                                title: category.charAt(0).toUpperCase() + category.slice(1),
                                description: `There are ${sections[category].length} commands`,
                                id: `${prefix}menu ${category}`,
                              })),
                            },
                          ],
                        }),
                      },
                    ]
                  : [
                      {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({ display_text: 'GitHub', url: tapLink, merchant_url: tapLink }),
                      },
                    ],
            },
            contextInfo: { mentionedJid: [m.sender] },
          }),
        },
        { quoted: m, userJid: sock.user.id }
      )

      await sock.relayMessage(m.chat, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
              },
            ],
          },
        ],
      })
    } catch (err) {
      console.error('[menu] interactive failed:', err.message)
      return reply(plain, { mentions: [m.sender] })
    }
  },
}
