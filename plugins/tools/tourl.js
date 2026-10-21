const upload = require('../../lib/uploadFile')

module.exports = {
  usage: ['tourl'],
  category: 'tools',
  execute: async ({ sock, m, config, prefix, reply }) => {
    const target = m.quoted || m
    const mime = (target.msg || target).mimetype || ''
    if (!mime) return reply(`Reply/send media with the caption ${prefix}tourl`)
    try {
      await reply(config.messages.wait)
      const buffer = await sock.downloadMediaMessage(target)
      const url = await upload(buffer)
      reply(`🔗 ${url}`)
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
