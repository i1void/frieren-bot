const { fetchBuffer } = require('../../lib/http')

const FB_LINK = /^https?:\/\/(?:[\w-]+\.)?(?:facebook\.com|fb\.watch|fb\.com)\//i
const cleanTitle = (title = '') => {
  let t = String(title)
  const parts = t.split(' | ')
  if (parts.length > 1 && /views|reactions|likes/i.test(parts[0])) parts.shift()
  if (parts.length > 1) parts.pop()
  t = parts.join(' | ').trim()
  return t.length > 900 ? t.slice(0, 897) + '...' : t
}

module.exports = {
  usage: ['fb'],
  hidden: ['facebook'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, text, reply, useLimit, refundLimit }) => {
    const link = (text || '').trim().split(/\s+/)[0]
    if (!link) return reply(`Enter a Facebook link.\nExample: ${prefix}fb https://facebook.com/watch/xxxx`)
    if (!FB_LINK.test(link)) return reply('Invalid link, use a Facebook video/reel link.')
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/facebook', { url: link }, { timeout: 45000 })
      const result = json?.result
      if (!json?.status || !result) {
        refundLimit()
        return reply(mess.error)
      }

      const candidates = [result.media?.video, result.media?.video_sd].filter(
        (u, i, arr) => typeof u === 'string' && /^https?:\/\//.test(u) && arr.indexOf(u) === i
      )
      if (!candidates.length) {
        refundLimit()
        return reply('Video not found / invalid link.')
      }

      let buffer
      for (const url of candidates) {
        try {
          const buf = await fetchBuffer(url, { timeout: 90000 })
          if (buf?.length > 1024) {
            buffer = buf
            break
          }
        } catch (err) {
          console.error('[fb] download failed:', err.code || err.type || err.message.slice(-80))
        }
      }
      if (!buffer) {
        refundLimit()
        return reply(mess.error)
      }

      await sock.sendMessage(
        m.chat,
        { video: buffer, mimetype: 'video/mp4', caption: cleanTitle(result.title) },
        { quoted: m }
      )
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(mess.error)
    }
  },
}
