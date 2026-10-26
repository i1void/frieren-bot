const { proto, getContentType } = require('@whiskeysockets/baileys')
const chalk = require('chalk')
const fs = require('fs')
const axios = require('axios')
const { sizeFormatter } = require('human-readable')
const config = require('../config')
const { getTimezone } = require('./db')

// Compact uptime, e.g. "2d 3h 5m 10s". Units that are zero at the front are left out ("3h 5m 10s", "45s").
exports.runtime = (seconds) => {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [d && `${d}d`, (d || h) && `${h}h`, (d || h || m) && `${m}m`, `${s}s`].filter(Boolean).join(' ')
}

exports.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Every identifier a group participant is known by. In groups that use LIDs, `id` is "xxx@lid" and the
// phone-number JID sits in another field (its name depends on the Baileys version), so all of them are kept.
const participantIds = (p) => [p.id, p.lid, p.jid, p.phoneNumber].filter((v) => typeof v === 'string' && v.includes('@'))

// All identifiers (phone-number JIDs and LIDs) of the group admins. `decode` strips device suffixes.
exports.getGroupAdmins = (participants, decode = (jid) => jid) =>
  participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin').flatMap(participantIds).map(decode)

exports.getBuffer = async (url, options = {}) => {
  const res = await axios({
    method: 'get',
    url,
    headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
    timeout: 30000,
    ...options,
    responseType: 'arraybuffer',
  })
  return res.data
}

exports.formatp = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
})

exports.smsg = (conn, m, store) => {
  if (!m) return m
  const M = proto.WebMessageInfo

  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = conn.decodeJid((m.fromMe && conn.user.id) || m.participant || m.key.participant || m.chat || '')
    if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
  }

  const viewOnceTypes = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']

  if (m.message) {
    m.mtype = getContentType(m.message)
    m.msg =
      viewOnceTypes.includes(m.mtype)
        ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
        : m.message[m.mtype]
    m.body =
      m.message.conversation ||
      m.msg?.caption ||
      m.msg?.text ||
      (m.mtype === 'listResponseMessage' && m.msg.singleSelectReply.selectedRowId) ||
      (m.mtype === 'buttonsResponseMessage' && m.msg.selectedButtonId) ||
      (viewOnceTypes.includes(m.mtype) && m.msg?.caption) ||
      m.text

    const quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null)
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []

    if (m.quoted) {
      let type = Object.keys(m.quoted)[0]
      m.quoted = m.quoted[type]
      if (type === 'productMessage') {
        type = Object.keys(m.quoted)[0]
        m.quoted = m.quoted[type]
      }
      if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }

      m.quoted.mtype = type
      m.quoted.id = m.msg.contextInfo.stanzaId
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
      m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
      m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id)
      m.quoted.text =
        m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
      m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []

      const vM = (m.quoted.fakeObj = M.fromObject({
        key: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }))

      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key })
      m.quoted.download = () => conn.downloadMediaMessage(m.quoted)
    }

    if (m.msg?.url) m.download = () => conn.downloadMediaMessage(m.msg)
    m.text =
      m.msg?.text || m.msg?.caption || m.message.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''
  } else {
    // Events without a real message body (reactions, protocol/poll updates, etc.)
    m.mtype = undefined
    m.msg = undefined
    m.text = ''
  }

  m.reply = (text, chatId = m.chat, options = {}) =>
    Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options })

  return m
}

// One console line per incoming message: time, chat (group / private), sender and text.
// Turn it off with `logChat: false` in config.json.
const groupNames = new Map() // chat id -> { at, name: Promise<string> }

// Names and text come from other people, so drop control characters (an ESC code
// could mess up the owner's terminal).
const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').trim()

const getGroupName = (conn, chat) => {
  let cached = groupNames.get(chat)
  if (!cached || Date.now() - cached.at > 10 * 60 * 1000) {
    const name = conn
      .groupMetadata(chat)
      .then((meta) => meta.subject || chat)
      .catch(() => chat)
    cached = { at: Date.now(), name }
    groupNames.set(chat, cached)
  }
  return cached.name
}

exports.logMessage = async (conn, m) => {
  try {
    if (config.logChat === false || !m.message || m.fromMe) return

    let text = clean(m.text)
    if (!text) text = `[${(m.mtype || 'message').replace('Message', '')}]`
    if (text.length > 80) text = text.slice(0, 80) + '…'
    let isCmd = config.prefixes.some((p) => p && text.startsWith(p))

    let time = new Intl.DateTimeFormat('en-GB', {
      timeZone: getTimezone(config),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(', ', ' ')
    let from = `${clean(m.pushName) || 'unknown'} (${m.sender.split('@')[0]})`
    let where = m.isGroup ? chalk.cyan(`GROUP   ${clean(await getGroupName(conn, m.chat))}`) : chalk.magenta('PRIVATE')

    console.log(`${chalk.gray(`[ ${time} ]`)} ${where} ${chalk.gray('~')} ${chalk.bold(from)} ${chalk.gray(':')} ${isCmd ? chalk.green(text) : text}`)
  } catch {
    // logging must never break the bot
  }
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright(`Update ${__filename}`))
  delete require.cache[file]
  require(file)
})
