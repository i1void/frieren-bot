module.exports = {
  name: 'sticker',
  aliases: ['s'],
  category: 'tools',
  description: 'Turn an image / short video into a sticker',
  execute: async ({ sock, m, config, prefix, reply }) => {
    const target = m.quoted && /image|video/.test(m.quoted.mtype) ? m.quoted : m
    const mime = (target.msg || target).mimetype || ''
    if (!/image|video/.test(mime)) return reply(`Reply/send an image or short video with the caption ${prefix}sticker`)
    try {
      const buffer = await sock.downloadMediaMessage(target)
      const opts = { packname: config.packName, author: config.authorName }
      if (/video/.test(mime)) await sock.sendVideoAsSticker(m.chat, buffer, m, opts)
      else await sock.sendImageAsSticker(m.chat, buffer, m, opts)
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
