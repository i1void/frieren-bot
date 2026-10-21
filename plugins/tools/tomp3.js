const { convertToMp3 } = require('../../lib/convert')

module.exports = {
  name: 'tomp3',
  aliases: ['toaudio'],
  category: 'tools',
  description: 'Convert video / audio to mp3',
  execute: async ({ sock, m, config, prefix, reply }) => {
    if (!m.quoted || !/video|audio/.test(m.quoted.mtype)) return reply(`Reply to a video/audio with the caption ${prefix}tomp3`)
    try {
      await reply(config.messages.wait)
      const buffer = await sock.downloadMediaMessage(m.quoted)
      const audio = await convertToMp3(buffer)
      await sock.sendMessage(m.chat, { audio, mimetype: 'audio/mpeg' }, { quoted: m })
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
