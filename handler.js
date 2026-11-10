import config from './config.json' with { type: 'json' }
import { sleep, getGroupAdmins } from './lib/utils.js'
import { getUser, spendLimit, restoreLimit, getTimezone } from './lib/limits.js'
import { isBanned, hasPremium } from './lib/access.js'
import { getDisabledPlugins, getDisabledCommands, isPluginDisabled, isGroupMode, isNoPrefix } from './lib/settings.js'
import { suggestCommands } from './lib/suggest.js'
import { getPlugin, listPlugins, listEvents } from './lib/pluginLoader.js'
import { createAntiSpam } from './lib/antispam.js'
import { isMuted } from './lib/group.js'

const antiSpam = createAntiSpam(config.antiSpam)
const PHONE_ARG = /^@?\+?\d[\d-]{7,}$/
const TYPO_TTL = 3 * 60 * 1000
const typoSessions = new Map() // sender -> { m, prefix, args, names, timer }

function checkPermission(plugin, { isOwner, isGroup, isAdmin, isBotAdmin }) {
  if (plugin.ownerOnly && !isOwner) return 'ownerOnly'
  if ((plugin.groupOnly || plugin.adminOnly || plugin.botAdmin) && !isGroup) return 'groupOnly'
  if (plugin.adminOnly && !isAdmin && !isOwner) return 'adminOnly'
  if (plugin.botAdmin && !isBotAdmin) return 'botAdminNeeded'
  return null
}

function parseCommand(body) {
  const usedPrefix = config.prefixes.find((p) => p && body.startsWith(p))
  // no-prefix mode (owner command "noprefix", or "" inside config.prefixes): plain words count as commands
  const noPrefix = usedPrefix === undefined && (isNoPrefix() || config.prefixes.includes(''))
  if (usedPrefix === undefined && !noPrefix) return null

  const prefix = usedPrefix || ''
  const [rawCmd, ...args] = body.slice(prefix.length).trim().split(/\s+/)
  const command = (rawCmd || '').toLowerCase()
  if (!command) return null
  // without a prefix only real commands run, so normal chat is never treated as a command
  if (usedPrefix === undefined && !getPlugin(command)) return null
  return { prefix, usedPrefix: usedPrefix !== undefined, command, args }
}

function typoSuggestions(command, isOwner) {
  const disabled = getDisabledPlugins()
  const offCommands = getDisabledCommands()
  const names = []
  for (const p of listPlugins()) {
    if (isPluginDisabled(p, disabled) || (p.ownerOnly && !isOwner)) continue // no hints for commands the sender cannot use
    names.push(...p.commands.filter((c) => !offCommands.includes(c)))
  }

  const seen = new Set()
  return suggestCommands(command, names).filter((h) => {
    const owner = getPlugin(h.name).name
    if (seen.has(owner)) return false
    seen.add(owner)
    return true
  })
}

function rememberTypo(m, { prefix, args }, hints) {
  clearTimeout(typoSessions.get(m.sender)?.timer)
  const timer = setTimeout(() => typoSessions.delete(m.sender), TYPO_TTL)
  timer.unref()
  typoSessions.set(m.sender, { m, prefix, args, names: hints.map((h) => h.name), timer })
}

function takeTypoChoice(m) {
  const session = typoSessions.get(m.sender)
  const body = (m.text || '').trim()
  if (!session || session.m.chat !== m.chat || !/^\d$/.test(body)) return null

  const command = session.names[Number(body) - 1]
  if (!command) return null
  clearTimeout(session.timer)
  typoSessions.delete(m.sender)
  return { m: session.m, prefix: session.prefix, usedPrefix: true, command, args: session.args }
}

const typoMessage = (command, prefix, hints) =>
  `🚩 Command *${prefix}${command}* not found. Did you mean:\n\n` +
  hints.map((h, i) => `${i + 1}. ${prefix}${h.name} (${h.accuracy}%)`).join('\n') +
  '\n\nReply with the number to run it (expires in 3 minutes).'

async function run(sock, m, store, { prefix, usedPrefix, command, args }) {
  const text = args.join(' ')
  const sender = m.sender
  // one identity per person, even when a chat shows a LID instead of the number
  const identity = m.senderPn || sender
  const owners = config.owner.map((v) => v.replace(/\D/g, ''))
  const isOwner = [sender, m.senderPn].filter(Boolean).some((jid) => owners.includes(jid.split('@')[0]))

  if (isBanned(identity) && !isOwner) return

  if (m.chat.endsWith('@g.us') && isMuted(m.chat) && !['mute', 'gc'].includes(getPlugin(command)?.name)) return

  const reply = (teks, opts = {}) => sock.sendMessage(m.chat, { text: teks, ...opts }, { quoted: m })

  const plugin = getPlugin(command)
  if (!plugin) {
    const hints = usedPrefix ? typoSuggestions(command, isOwner) : []
    if (hints.length) {
      rememberTypo(m, { prefix, args }, hints)
      await reply(typoMessage(command, prefix, hints))
    }
    return
  }
  if (isPluginDisabled(plugin) || getDisabledCommands().includes(command)) {
    return reply('[ System Notice ] This command is disabled by the owner')
  }

  if (!isOwner) {
    const gate = antiSpam.check(identity)
    if (!gate.ok) return gate.notice ? reply(`${mess[gate.notice]} (${gate.wait}s)`) : undefined
  }

  const isPremium = isOwner || hasPremium(identity)

  if (!m.chat.endsWith('@g.us') && isGroupMode() && !isPremium && !['premium', 'owner'].includes(plugin.name)) {
    return reply(`⚠️ The bot only works in groups right now. Private chat is for premium users.\nSend *${prefix}premium* to see how to upgrade.`)
  }

  const user = getUser(identity, config)
  if (isPremium) user.premium = true

  const isGroup = m.chat.endsWith('@g.us')
  const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch(() => null) : null
  const groupAdmins = isGroup && groupMetadata ? getGroupAdmins(groupMetadata.participants, sock.decodeJid) : []
  const botIds = [sock.user.id, sock.user.lid].filter(Boolean).map((jid) => sock.decodeJid(jid))
  const isBotAdmin = isGroup ? botIds.some((id) => groupAdmins.includes(id)) : false
  const isAdmin = isGroup ? groupAdmins.includes(sender) : false

  const denied = checkPermission(plugin, { isOwner, isGroup, isAdmin, isBotAdmin })
  if (denied) return reply(mess[denied])

  const mentionedJid =
    m.mentionedJid && m.mentionedJid.length
      ? m.mentionedJid
      : m.quoted
      ? [m.quoted.sender]
      : PHONE_ARG.test(args[0] || '')
      ? [`${args[0].replace(/\D/g, '')}@s.whatsapp.net`]
      : []

  let spent = false
  const useLimit = () => {
    if (isPremium) return true
    if (!spendLimit(identity, config)) {
      reply(`${mess.limitHabis}\nYour limit resets every day at 00:00 (${getTimezone(config)}).`)
      return false
    }
    spent = true
    return true
  }

  const refundLimit = () => {
    if (!spent) return
    spent = false
    restoreLimit(identity)
  }

  const ctx = {
    sock,
    m,
    store,
    config,
    plugin,
    command,
    args,
    text,
    prefix,
    reply,
    sleep,
    mentionedJid,
    user,
    isOwner,
    isPremium,
    isGroup,
    isAdmin,
    isBotAdmin,
    groupMetadata,
    groupAdmins,
    useLimit,
    refundLimit,
  }

  try {
    await plugin.execute(ctx)
  } catch (err) {
    console.error(`[plugin:${plugin.name}]`, err)
    refundLimit()
    reply(mess.error).catch(() => {})
  }
}

export default async (sock, m, store) => {
  try {
    if (!m.message) return

    for (const event of listEvents()) {
      if (event.groupOnly && !m.chat.endsWith('@g.us')) continue
      try {
        if (await event.execute({ sock, m, store, config })) return
      } catch (err) {
        console.error(`[event:${event.name}]`, err)
      }
    }

    const picked = takeTypoChoice(m)
    if (picked) return await run(sock, picked.m, store, picked)

    const parsed = parseCommand(m.text || '')
    if (parsed) await run(sock, m, store, parsed)
  } catch (err) {
    console.error(err)
  }
}

