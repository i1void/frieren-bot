const upload = require('../../lib/uploadFile')
const { fetchBuffer } = require('../../lib/http')

const IMG_LINK = /^https?:\/\/\S+$/i

module.exports = {
  usage: ['removebg'],
  hidden: ['nobg', 'rbg'],
  use: 'image / link',
  category: 'utilities',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, useLimit, refundLimit }) => {
    const target = m.quoted || m
    const isImage = /image/.test((target.msg || target).mimetype || '')
    const link = (text || '').trim().split(/\s+/)[0]

    if (!isImage && !IMG_LINK.test(link)) {
      return reply(`Send or reply to an image with the caption ${prefix}${command}\nOr use an image link: ${prefix}${command} https://example.com/photo.jpg`)
    }
    if (!useLimit()) return

    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})

      // The API needs a public link: use the one given, otherwise upload the image first.
      const url = isImage ? await upload(await sock.downloadMediaMessage(target)) : link

      const json = await Api.json('/tools/removebg', { url }, { timeout: 90000 })
      const result = json?.url || json?.low_resolution || json?.preview_demo
      if (json?.status !== 200 || !result) {
        refundLimit()
        return reply(mess.error)
      }

      const buffer = await fetchBuffer(result, { timeout: 60000 })
      // Sent as a document so WhatsApp keeps the PNG transparency (as an image it is flattened to a solid background).
      await sock.sendMessage(
        m.chat,
        { document: buffer, mimetype: 'image/png', fileName: 'removebg.png', caption: mess.done },
        { quoted: m }
      )
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
