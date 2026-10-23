const { getRoute, addRoute } = require('../../lib/menfess')
const { isBanned } = require('../../lib/access')

const MEDIA = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage']
const MEDIA_KEY = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', stickerMessage: 'sticker' }

// Two-way menfess. When someone replies (quotes) a message the bot sent for a menfess, the reply is
// forwarded to the other side, again without revealing any number. Commands are left alone.
module.exports = {
  name: 'menfess-reply',
  event: true,
  execute: async ({ sock, m, config }) => {
    if (m.isGroup || m.fromMe || !m.quoted?.id) return false

    const route = getRoute(m.quoted.id)
    if (!route) return false

    // A command typed as a reply (e.g. ".menfess off") is a command, not a message for the other side.
    const text = (m.text || '').trim()
    if (config.prefixes.some((p) => p && text.startsWith(p))) return false

    if (isBanned(m.sender)) return true

    if (m.mtype !== 'conversation' && m.mtype !== 'extendedTextMessage' && !MEDIA.includes(m.mtype)) {
      await sock.sendMessage(m.chat, { text: 'Only text, photo, video, voice note and sticker can be sent here.' }, { quoted: m })
      return true
    }

    // route.toTarget: the message being answered was delivered to the receiver, so this person IS the receiver.
    const header = route.toTarget
      ? `💬 *MENFESS* #${route.code}\nReply from the receiver:`
      : `💬 *MENFESS* #${route.code}\nMessage from the sender:`
    const footer = '\n\n_Reply to this message to answer._'

    try {
      const delivered = []
      if (MEDIA.includes(m.mtype)) {
        const buffer = await m.download()
        const key = MEDIA_KEY[m.mtype]
        if (key === 'image' || key === 'video') {
          delivered.push(await sock.sendMessage(route.forwardTo, { [key]: buffer, caption: `${header}${text ? `\n\n${text}` : ''}${footer}` }))
        } else {
          // Audio and stickers cannot carry a caption: header first, then the media.
          delivered.push(await sock.sendMessage(route.forwardTo, { text: `${header}${footer}` }))
          delivered.push(
            await sock.sendMessage(route.forwardTo, key === 'audio' ? { audio: buffer, mimetype: m.msg.mimetype || 'audio/mp4', ptt: Boolean(m.msg.ptt) } : { sticker: buffer })
          )
        }
      } else {
        delivered.push(await sock.sendMessage(route.forwardTo, { text: `${header}\n\n${text}${footer}` }))
      }

      // Replying to what was just delivered goes back to this person: the direction flips.
      for (const msg of delivered) addRoute(msg?.key?.id, route.code, m.chat, !route.toTarget)
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
    } catch (err) {
      console.error('[menfess-reply]', err)
      await sock.sendMessage(m.chat, { text: config.messages.error }, { quoted: m }).catch(() => {})
    }
    return true // handled
  },
}
