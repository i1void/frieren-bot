// "720x720" -> 518400, so the biggest variant sorts first
const pixels = (v) => (v.resolution || '').split('x').reduce((a, b) => a * (Number(b) || 0), 1)

module.exports = {
  usage: ['twitter'],
  hidden: ['twt'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, sleep, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a Twitter/X link.\nExample: ${prefix}${command} https://x.com/user/status/123`)
    if (!/(twitter|x)\.com\//i.test(text)) return reply('Invalid link, use a Twitter/X post link.')
    if (!useLimit()) return
    let sent = 0 // media already delivered: no refund after that
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/twitter', { url: text })
      const { title, media } = json?.result || {}
      if (!json?.status || !media?.length) {
        refundLimit()
        return reply('Media not found / invalid link.')
      }
      for (let i = 0; i < media.length; i++) {
        const item = media[i]
        const caption = i === 0 ? title || '' : ''
        if (item.type === 'video' || item.type === 'animated_gif' || item.type === 'gif') {
          const best = [...(item.variants || [])].sort((a, b) => pixels(b) - pixels(a))[0]
          if (!best?.url) continue
          await sock.sendMessage(m.chat, { video: { url: best.url }, caption }, { quoted: m })
        } else {
          const url = item.url || item.variants?.[0]?.url
          if (!url) continue
          await sock.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
        }
        sent++
        await sleep(500)
      }
      if (!sent) {
        refundLimit()
        reply('Media not found / invalid link.')
      }
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
