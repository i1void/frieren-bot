const { quoteBlock, getRoute, getActiveRoute, getExpiredRoute, addRoute } = require('../../lib/menfess')
const { isBanned } = require('../../lib/access')

const MEDIA = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage']
const MEDIA_KEY = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', stickerMessage: 'sticker' }

const noticed = new Map() // chat -> msgId of the expired menfess it was already told about (once per menfess)

// Two-way menfess. A message is forwarded to the other side, without revealing any number, when it
//  - replies (quotes) a menfess message the bot sent, or
//  - is sent without quoting anything, shortly after the person received a menfess message.
// Commands are left alone.
module.exports = {
  name: 'menfess-reply',
  event: true,
  execute: async ({ sock, m, config }) => {
    if (m.isGroup || m.fromMe) return false

    // A command (e.g. ".menfess off") is a command, not a message for the other side.
    const text = (m.text || '').trim()
    if (config.prefixes.some((p) => p && text.startsWith(p))) return false

    // Quoting something decides the thread. Without a quote, the latest recent menfess received is used.
    const viaQuote = Boolean(m.quoted?.id)
    const route = viaQuote ? getRoute(m.quoted.id) : getActiveRoute(m.chat)

    if (!route) {
      // No quote and the quick-answer time is over: say so once, so the person knows to use "Reply".
      const expired = !viaQuote && (m.mtype === 'conversation' || m.mtype === 'extendedTextMessage' || MEDIA.includes(m.mtype)) && getExpiredRoute(m.chat)
      if (expired && noticed.get(m.chat) !== expired.msgId) {
        if (noticed.size > 500) noticed.clear()
        noticed.set(m.chat, expired.msgId)
        await sock.sendMessage(
          m.chat,
          { text: `Menfess #${expired.code} can no longer be answered by just sending a message (24 hours passed).\n\nTo answer it, reply to the menfess message itself.` },
          { quoted: m }
        )
        return true
      }
      return false
    }

    if (isBanned(m.sender)) return true

    if (m.mtype !== 'conversation' && m.mtype !== 'extendedTextMessage' && !MEDIA.includes(m.mtype)) {
      if (!viaQuote) return false // reactions and other system messages are not part of the chat
      await sock.sendMessage(m.chat, { text: 'Only text, photo, video, voice note and sticker can be sent here.' }, { quoted: m })
      return true
    }

    // route.toTarget: the message being answered was delivered to the receiver, so this person IS the receiver.
    const header = route.toTarget
      ? `💬 *MENFESS* #${route.code}\nReply from: *Receiver*`
      : `💬 *MENFESS* #${route.code}\nReply from: *Sender*`
    const footer = '\n\n_Send a message to answer, or reply to this one._'

    try {
      const delivered = []
      if (MEDIA.includes(m.mtype)) {
        const buffer = await m.download()
        const key = MEDIA_KEY[m.mtype]
        if (key === 'image' || key === 'video') {
          delivered.push(await sock.sendMessage(route.forwardTo, { [key]: buffer, caption: `${header}${text ? `\n\n${quoteBlock(text)}` : ''}${footer}` }))
        } else {
          // Audio and stickers cannot carry a caption: header first, then the media.
          delivered.push(await sock.sendMessage(route.forwardTo, { text: `${header}${footer}` }))
          delivered.push(
            await sock.sendMessage(route.forwardTo, key === 'audio' ? { audio: buffer, mimetype: m.msg.mimetype || 'audio/mp4', ptt: Boolean(m.msg.ptt) } : { sticker: buffer })
          )
        }
      } else {
        delivered.push(await sock.sendMessage(route.forwardTo, { text: `${header}\n\n${quoteBlock(text)}${footer}` }))
      }

      // Replying to what was just delivered goes back to this person: the direction flips.
      for (const msg of delivered) addRoute(msg?.key?.id, route.code, m.chat, !route.toTarget, route.forwardTo)
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
    } catch (err) {
      console.error('[menfess-reply]', err)
      await sock.sendMessage(m.chat, { text: config.messages.error }, { quoted: m }).catch(() => {})
    }
    return true // handled
  },
}
