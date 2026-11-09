import { applyAudioFilter } from '../../lib/convert.js'

const FILTERS = {
  bass: 'equalizer=f=94:width_type=o:width=2:g=30',
  blown: 'acrusher=.1:1:64:0:log',
  chipmunk: 'atempo=0.5,asetrate=65100',
  deep: 'atempo=4/4,asetrate=44500*2/3',
  earrape: 'volume=12',
  fast: 'atempo=1.63,asetrate=44100',
  fat: 'atempo=1.6,asetrate=22100',
  nightcore: 'atempo=1.06,asetrate=44100*1.25',
  reverse: 'areverse',
  robot: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
  slow: 'atempo=0.7,asetrate=44100',
}

export default {
  usage: Object.keys(FILTERS),
  use: 'reply audio',
  category: 'voice changer',
  limit: true,
  execute: async ({ sock, m, command, reply, useLimit, refundLimit }) => {
    if (!m.quoted || !/audio/.test(m.quoted.mtype)) return reply('❌ Reply to an audio or voice note to use this command.')
    if (!useLimit()) return

    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const voice = Boolean(m.quoted.ptt)
      const audio = await applyAudioFilter(await sock.downloadMediaMessage(m.quoted), FILTERS[command], { voice })
      await sock.sendMessage(
        m.chat,
        voice ? { audio, mimetype: 'audio/ogg; codecs=opus', ptt: true } : { audio, mimetype: 'audio/mpeg' },
        { quoted: m }
      )
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
