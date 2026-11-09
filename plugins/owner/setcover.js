import sharp from 'sharp'
import { fetchBuffer } from '../../lib/http.js'
import { saveThumbnailFile, useThumbnailLink, disableThumbnail, resetThumbnail } from '../../lib/thumbnail.js'

const IMG_LINK = /^https?:\/\/\S+$/i
const BIG = 300 * 1024

export default {
  usage: ['setcover'],
  hidden: ['setthumb'],
  use: 'reply image / link / off / reset',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, m, prefix, command, text, reply }) => {
    const arg = text.trim()
    const target = m.quoted || m
    const isImage = /image/.test((target.msg || target).mimetype || '')

    try {
      if (arg === 'off') {
        disableThumbnail()
        return reply('✅ Menu thumbnail turned off (plain text menu).')
      }
      if (arg === 'reset') {
        resetThumbnail()
        return reply('✅ Thumbnail setting reset (uses config.json / thumb.jpg).')
      }

      if (IMG_LINK.test(arg)) {
        const buffer = await fetchBuffer(arg, { timeout: 15000 })
        await sharp(buffer).metadata() // throws when the link is not an image
        useThumbnailLink(arg)
        const warn = buffer.length > BIG ? `\n⚠️ The image is ${Math.round(buffer.length / 1024)} KB, a smaller one (under 100 KB) shows more reliably.` : ''
        return reply(`✅ Menu thumbnail set from link.${warn}`)
      }

      if (isImage) {
        sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
        const buffer = await sock.downloadMediaMessage(target)
        const thumb = await sharp(buffer).rotate().resize(600, 314, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer()
        saveThumbnailFile(thumb)
        return reply(`✅ Menu thumbnail updated (${Math.round(thumb.length / 1024)} KB).`)
      }

      reply(
        `Set the menu thumbnail:\n` +
          `• Send or reply to an image with ${prefix}${command}\n` +
          `• ${prefix}${command} https://example.com/image.jpg\n` +
          `• ${prefix}${command} off : no thumbnail\n` +
          `• ${prefix}${command} reset : back to config.json / thumb.jpg`
      )
    } catch (err) {
      console.error(err)
      await reply("❌ That isn't a usable image, or it couldn't be downloaded.").catch(console.error)
    }
  },
}
