const { convertToMp3 } = require('../../lib/convert')

module.exports = {
  usage: ['tomp3'],
  hidden: ['toaudio'],
  category: 'converter',
  execute: async ({ sock, m, prefix, reply }) => {
    if (!m.quoted || !/video|audio/.test(m.quoted.mtype)) return reply(`Reply to a video/audio with the caption ${prefix}tomp3`)
    try {
      await reply(mess.wait)
      const buffer = await sock.downloadMediaMessage(m.quoted)
      const audio = await convertToMp3(buffer)
      await sock.sendMessage(m.chat, { audio, mimetype: 'audio/mpeg' }, { quoted: m })
    } catch (err) {
      console.error(err)
      reply(mess.error)
    }
  },
}
