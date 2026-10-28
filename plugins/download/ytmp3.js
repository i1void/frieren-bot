const { fetchBuffer } = require('../../lib/http')
const { convertToMp3 } = require('../../lib/convert')

const YT_LINK = /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i
const MAX_MB = 100

module.exports = {
  usage: ['ytmp3'],
  hidden: ['ytaudio'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, useLimit, refundLimit }) => {
    const link = (text || '').trim().split(/\s+/)[0]
    if (!link) return reply(`Enter a YouTube link.\nExample: ${prefix}${command} https://youtu.be/xxxx`)
    if (!YT_LINK.test(link)) return reply('Invalid link, use a YouTube link.')
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/ytmp3', { url: link }, { timeout: 45000 })
      const r = json?.result
      const file = r?.m4a?.url ? r.m4a : r?.best
      if (!json?.status || !file?.url) {
        refundLimit()
        return reply(mess.error)
      }
      if (file.size_mb > MAX_MB) {
        refundLimit()
        return reply(`Audio too large (${file.size_mb} MB, max ${MAX_MB} MB).`)
      }
      let audio = await fetchBuffer(file.url, { timeout: 120000 })
      let mimetype = file.mime
      if (file.container !== 'm4a') {
        audio = await convertToMp3(audio)
        mimetype = 'audio/mpeg'
      }
      await sock.sendMessage(
        m.chat,
        {
          audio,
          mimetype,
          fileName: `${r.title}.${mimetype === 'audio/mpeg' ? 'mp3' : 'm4a'}`,
          contextInfo: {
            externalAdReply: {
              title: r.title,
              body: r.author,
              thumbnailUrl: r.thumbnail,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: m }
      )
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
