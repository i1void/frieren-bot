// Command router. Commands themselves live in plugins/ (see lib/pluginLoader.js).
const fs = require('fs')
const chalk = require('chalk')
const config = require('./config')
const { sleep, getGroupAdmins } = require('./lib/myfunc')
const { getUser, spendLimit, restoreLimit, getTimezone } = require('./lib/db')
const { isBanned, hasPremium } = require('./lib/access')
const { getDisabledPlugins, isPluginDisabled } = require('./lib/settings')
const { suggestCommands } = require('./lib/suggest')
const { getPlugin, listPlugins, listEvents } = require('./lib/pluginLoader')
const { createAntiSpam } = require('./lib/antispam')

const antiSpam = createAntiSpam(config.antiSpam)
const PHONE_ARG = /^@?\+?\d[\d-]{7,}$/
const TYPO_TTL = 3 * 60 * 1000
const typoSessions = new Map() // sender -> { m, prefix, args, names, timer }

// Returns the config.messages key to reply with, or null when allowed.
// adminOnly / botAdmin imply groupOnly. The owner bypasses adminOnly but NOT botAdmin.
function checkPermission(plugin, { isOwner, isGroup, isAdmin, isBotAdmin }) {
  if (plugin.ownerOnly && !isOwner) return 'ownerOnly'
  if ((plugin.groupOnly || plugin.adminOnly || plugin.botAdmin) && !isGroup) return 'groupOnly'
  if (plugin.adminOnly && !isAdmin && !isOwner) return 'adminOnly'
  if (plugin.botAdmin && !isBotAdmin) return 'botAdminNeeded'
  return null
}

// { prefix, usedPrefix, command, args } for a message that is a command, otherwise null.
function parseCommand(body) {
  const usedPrefix = config.prefixes.find((p) => p && body.startsWith(p))
  const isCmd = usedPrefix !== undefined || (config.prefixes.includes('') && body.length > 0)
  if (!isCmd) return null

  const prefix = usedPrefix || ''
  const [rawCmd, ...args] = body.slice(prefix.length).trim().split(/\s+/)
  const command = (rawCmd || '').toLowerCase()
  return command ? { prefix, usedPrefix: usedPrefix !== undefined, command, args } : null
}

// Enabled commands that are close to a mistyped one, best first.
function typoSuggestions(command, isOwner) {
  const disabled = getDisabledPlugins()
  const names = []
  for (const p of listPlugins()) {
    if (isPluginDisabled(p, disabled) || (p.ownerOnly && !isOwner)) continue // no hints for commands the sender cannot use
    names.push(p.name, ...p.aliases)
  }

  const seen = new Set()
  return suggestCommands(command, names).filter((h) => {
    const owner = getPlugin(h.name).name
    if (seen.has(owner)) return false
    seen.add(owner)
    return true
  })
}

// After a "Did you mean" list the user can answer with a number. The original message is kept,
// so a command that needs a replied image or video still has it when it runs.
function rememberTypo(m, { prefix, args }, hints) {
  clearTimeout(typoSessions.get(m.sender)?.timer)
  const timer = setTimeout(() => typoSessions.delete(m.sender), TYPO_TTL)
  timer.unref()
  typoSessions.set(m.sender, { m, prefix, args, names: hints.map((h) => h.name), timer })
}

// When `m` is the number answer to a "Did you mean" list, returns the command to run instead.
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
  const senderNumber = sender.split('@')[0]
  const isOwner = config.owner.map((v) => v.replace(/\D/g, '')).includes(senderNumber)

  if (isBanned(sender) && !isOwner) return

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
  if (isPluginDisabled(plugin)) {
    return reply('[ System Notice ] This command is disabled by the owner')
  }

  if (!isOwner) {
    const gate = antiSpam.check(sender)
    if (!gate.ok) return gate.notice ? reply(`${config.messages[gate.notice]} (${gate.wait}s)`) : undefined
  }

  const isPremium = isOwner || hasPremium(sender)
  const user = getUser(sender, config)
  if (isPremium) user.premium = true

  const isGroup = m.chat.endsWith('@g.us')
  const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch(() => null) : null
  const groupAdmins = isGroup && groupMetadata ? getGroupAdmins(groupMetadata.participants) : []
  const botNumber = sock.decodeJid(sock.user.id)
  const isBotAdmin = isGroup ? groupAdmins.includes(botNumber) : false
  const isAdmin = isGroup ? groupAdmins.includes(sender) : false

  const denied = checkPermission(plugin, { isOwner, isGroup, isAdmin, isBotAdmin })
  if (denied) return reply(config.messages[denied])

  const mentionedJid =
    m.mentionedJid && m.mentionedJid.length
      ? m.mentionedJid
      : m.quoted
      ? [m.quoted.sender]
      : PHONE_ARG.test(args[0] || '')
      ? [`${args[0].replace(/\D/g, '')}@s.whatsapp.net`]
      : []

  // Spending a point is one atomic database update, so two commands running at
  // the same time can never spend the same point twice.
  let spent = false
  const useLimit = () => {
    if (isPremium) return true
    if (!spendLimit(sender, config)) {
      reply(`${config.messages.limitHabis}\nYour limit resets every day at 00:00 (${getTimezone(config)}).`)
      return false
    }
    spent = true
    return true
  }

  // Gives back the limit spent by this command (once). Plugins call it when the
  // job failed before anything was delivered.
  const refundLimit = () => {
    if (!spent) return
    spent = false
    restoreLimit(sender)
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

  // Safety net: a plugin that throws gets the limit back and the user gets an answer.
  try {
    await plugin.execute(ctx)
  } catch (err) {
    console.error(`[plugin:${plugin.name}]`, err)
    refundLimit()
    reply(config.messages.error).catch(() => {})
  }
}

module.exports = async (sock, m, store) => {
  try {
    if (!m.message) return

    // Event plugins see every message. One that returns true has handled it: nothing else runs.
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

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`Update '${__filename}'`))
  delete require.cache[file]
  require(file)
})
