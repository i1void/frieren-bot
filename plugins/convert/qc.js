const sharp = require('sharp')
const { buildQuoteSvg } = require('../../lib/quote')
const { fetchBuffer } = require('../../lib/http')

const MAX_CHARS = 200

module.exports = {
  usage: ['qc'],
  use: 'text / reply',
  category: 'converter',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const input = text || m.quoted?.text || ''
    if (!input) return reply(`Type some text or reply to a message.\nExample: ${prefix}${command} Hello world`)
    if (input.length > MAX_CHARS) return reply(`Max ${MAX_CHARS} characters.`)
    if (!useLimit()) return
    try {
      // With a reply, the quote is attributed to the person who wrote the replied message.
      const target = text ? m.sender : m.quoted?.sender || m.sender
      const name = target === m.sender ? m.pushName || target.split('@')[0] : await sock.getName(target)

      let avatarDataUri = null
      try {
        const url = await sock.profilePictureUrl(target, 'image')
        const avatar = await sharp(await fetchBuffer(url)).resize(144, 144, { fit: 'cover' }).png().toBuffer()
        avatarDataUri = `data:image/png;base64,${avatar.toString('base64')}`
      } catch {} // no profile picture or hidden: a coloured initial is drawn instead

      const { svg, width, height } = buildQuoteSvg({ name, text: input, seed: target, avatarDataUri })
      const image = await sharp(Buffer.from(svg), { density: 144 })
        .resize(width, height)
        .png()
        .toBuffer()
      await sock.sendImageAsSticker(m.chat, image, m, { packname: config.packName, author: config.authorName })
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
