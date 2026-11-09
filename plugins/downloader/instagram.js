const IG_LINK = /^https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\//i

export default {
  usage: ['ig'],
  hidden: ['instagram', 'igdl'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, text, reply, sleep, useLimit, refundLimit }) => {
    const link = (text || '').trim().split(/\s+/)[0]
    if (!link) return reply(`Enter an Instagram link.\nExample: ${prefix}ig https://instagram.com/p/xxxx`)
    if (!IG_LINK.test(link)) return reply('Invalid link, use an Instagram post/reel link.')
    if (!useLimit()) return
    let sent = 0 // media already delivered: no refund after that
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/instagramv2', { url: link }, { timeout: 45000 })
      const downloads = json?.result?.downloads || []
      if (!json?.status || !downloads.length) {
        refundLimit()
        return reply('Media not found / invalid link.')
      }
      for (const media of downloads) {
        const content = media.type === 'video' ? { video: { url: media.url } } : { image: { url: media.url } }
        await sock.sendMessage(m.chat, content, { quoted: m })
        sent++
        await sleep(500)
      }
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
