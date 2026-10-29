const upload = require('../../lib/uploadFile')

module.exports = {
  usage: ['tourl'],
  category: 'utilities',
  execute: async ({ sock, m, prefix, reply }) => {
    const target = m.quoted || m
    const mime = (target.msg || target).mimetype || ''
    if (!mime) return reply(`Reply/send media with the caption ${prefix}tourl`)
    try {
      await reply(mess.wait)
      const buffer = await sock.downloadMediaMessage(target)
      const url = await upload(buffer)
      reply(`🔗 ${url}`)
    } catch (err) {
      console.error(err)
      await reply(mess.error).catch(console.error)
    }
  },
}
