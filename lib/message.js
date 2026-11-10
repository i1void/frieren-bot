import chalk from 'chalk'
import { proto, getContentType } from './baileys.js'
import config from '../config.json' with { type: 'json' }
import { getTimezone } from './limits.js'

export const smsg = (conn, m, store) => {
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
    // senderPn is the phone-number JID when sender is a LID (key.participantAlt / remoteJidAlt)
    const alt = conn.decodeJid((m.isGroup ? m.key.participantAlt : m.key.remoteJidAlt) || '')
    m.senderPn = m.sender.endsWith('@lid') ? (alt.endsWith('@s.whatsapp.net') ? alt : '') : m.sender
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
    // tapped button / list row from an interactive message: the command is the button's id, not its label
    let buttonId = ''
    if (m.mtype === 'interactiveResponseMessage') {
      try {
        const params = JSON.parse(m.msg.nativeFlowResponseMessage?.paramsJson || '{}')
        buttonId = String(params.id ?? params.selectedId ?? '')
      } catch {}
    }
    m.text =
      buttonId ||
      m.msg?.text ||
      m.msg?.caption ||
      m.message.conversation ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      m.msg?.body?.text ||
      ''
  } else {
    m.mtype = undefined
    m.msg = undefined
    m.text = ''
  }

  m.reply = (text, chatId = m.chat, options = {}) =>
    Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options })

  return m
}

const groupNames = new Map() // chat id -> { at, name: Promise<string> }

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

export const logMessage = async (conn, m) => {
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
  }
}

