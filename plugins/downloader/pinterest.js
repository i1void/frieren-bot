import { remuxToMp4 } from '../../lib/convert.js'
import { fetchBuffer } from '../../lib/http.js'

export default {
  usage: ['pinterest'],
  hidden: ['pin', 'pindl'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, sleep, useLimit, refundLimit }) => {
    if (!text) return reply(`Enter a Pinterest link.\nExample: ${prefix}${command} https://pin.it/xxxx`)
    if (!/(pinterest\.[a-z.]+|pin\.it)\//i.test(text)) return reply('Invalid link, use a Pinterest pin link.')
    if (!useLimit()) return
    let sent = false // media already delivered: no refund after that
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/pinterest', { url: text.trim() }, { timeout: 30000 })
      const { title, type, media } = json?.result || {}
      if (!json?.status || !media) {
        refundLimit()
        return reply('Media not found / invalid link.')
      }

      const caption = title || ''

      if (media.video) {
        let video
        try {
          video = await remuxToMp4(await fetchBuffer(media.video, { timeout: 60000 }))
        } catch (e) {
          console.error('pinterest remux failed, sending original url:', e.message)
        }
        await sock.sendMessage(
          m.chat,
          video ? { video, mimetype: 'video/mp4', caption } : { video: { url: media.video }, mimetype: 'video/mp4', caption },
          { quoted: m }
        )
        sent = true
        return
      }

      const images = [...new Set([media.image, ...(Array.isArray(media.images) ? media.images : [])].filter(Boolean))]
      if (images.length) {
        for (let i = 0; i < images.length; i++) {
          await sock.sendMessage(
            m.chat,
            { image: { url: images[i] }, caption: i === 0 ? caption : '' },
            { quoted: m }
          )
          sent = true
          if (i < images.length - 1) await sleep(500)
        }
        return
      }

      refundLimit()
      return reply('Media not found / invalid link.')
    } catch (err) {
      console.error(err)
      if (!sent) refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
