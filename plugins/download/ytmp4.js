
const { fetchBuffer } = require('../../lib/http')

const YT_LINK = /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i
const MAX_MB = 100

module.exports = {
  usage: ['ytmp4'],
  hidden: ['ytvideo'],
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
      const json = await Api.json('/downloader/ytmp4', { url: link }, { timeout: 45000 })
      const r = json?.result
      if (!json?.status || !r?.url) {
        refundLimit()
        return reply(mess.error)
      }
      if (r.size_mb > MAX_MB) {
        refundLimit()
        return reply(`Video too large (${r.size_mb} MB, max ${MAX_MB} MB).`)
      }
      const video = await fetchBuffer(r.url, { timeout: 120000 })
      const caption = `*${r.title}*\n${r.author} • ${r.quality || ''}`.trim()
      await sock.sendMessage(m.chat, { video, mimetype: 'video/mp4', caption }, { quoted: m })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
