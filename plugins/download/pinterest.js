module.exports = {
  usage: ['pinterest'],
  hidden: ['pin', 'pindl'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a Pinterest link.\nExample: ${prefix}${command} https://pin.it/xxxx`)
    if (!/(pinterest\.[a-z.]+|pin\.it)\//i.test(text)) return reply('Invalid link, use a Pinterest pin link.')
    if (!useLimit()) return
    let sent = false // media already delivered: no refund after that
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/pinterestv2', { url: text.trim() }, { timeout: 30000 })
      const { title, type, downloads } = json?.result || {}
      if (!json?.status || !downloads?.length) {
        refundLimit()
        return reply('Media not found / invalid link.')
      }

      const caption = title || ''
      const isCover = (d) => /cover/i.test(d.quality || '')

      // Video pin: prefer the [Direct] .mp4 link (the tokenized "image" entry is only a redirect to the same video)
      const video =
        downloads.find((d) => d.type === 'video' && /\.mp4($|\?)/i.test(d.url)) ||
        downloads.find((d) => d.type === 'video')

      if (type === 'video' && video?.url) {
        await sock.sendMessage(m.chat, { video: { url: video.url }, caption }, { quoted: m })
        sent = true
        return
      }

      // Image pin: first non-cover image, otherwise whatever image is available
      const image = downloads.find((d) => d.type === 'image' && !isCover(d)) || downloads.find((d) => d.type === 'image')
      if (image?.url) {
        await sock.sendMessage(m.chat, { image: { url: image.url }, caption }, { quoted: m })
        sent = true
        return
      }

      refundLimit()
      reply('Media not found / invalid link.')
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
