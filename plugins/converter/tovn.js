import { convertToOpus } from '../../lib/convert.js'

export default {
  usage: ['tovn'],
  category: 'converter',
  execute: async ({ sock, m, prefix, reply }) => {
    if (!m.quoted || !/audio/.test(m.quoted.mtype)) return reply(`Reply to an audio with the caption ${prefix}tovn`)
    try {
      const buffer = await sock.downloadMediaMessage(m.quoted)
      const audio = await convertToOpus(buffer)
      await sock.sendMessage(m.chat, { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    } catch (err) {
      console.error(err)
      await reply(mess.error).catch(console.error)
    }
  },
}
