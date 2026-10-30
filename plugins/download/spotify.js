const { fetchBuffer } = require('../../lib/http')

const SPOTIFY_LINK = /^https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z-]+\/)?track\/[\w]+/i
const MAX_MB = 100

module.exports = {
  usage: ['spotify'],
  hidden: ['spotifydl', 'spdl'],
  use: 'link',
  category: 'downloader',
  limit: true,
  execute: async ({ sock, m, prefix, command, text, reply, useLimit, refundLimit }) => {
    const link = (text || '').trim().split(/\s+/)[0]
    if (!link) return reply(`Enter a Spotify track link.\nExample: ${prefix}${command} https://open.spotify.com/track/xxxx`)
    if (!SPOTIFY_LINK.test(link)) return reply('Invalid link, use a Spotify track link.')
    if (!useLimit()) return

    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const json = await Api.json('/downloader/spotify', { url: link }, { timeout: 45000 })
      const r = json?.result
      const audioFile = r?.downloads?.find((d) => d.type === 'audio' && d.url)
      if (!json?.status || !audioFile) {
        refundLimit()
        return reply(mess.error).catch(console.error)
      }

      const audio = await fetchBuffer(audioFile.url, { timeout: 120000 })
      if (audio.length > MAX_MB * 1024 * 1024) {
        refundLimit()
        return reply(`Audio too large (max ${MAX_MB} MB).`)
      }

      const cover = r.downloads.find((d) => d.type === 'image')?.url || r.thumbnail
      const caption = [
        '*`「 SPOTIFY 」`*',
        `𖦹 title : *${r.title}*`,
        `𖦹 artist : *${r.artist}*`,
        r.album ? `𖦹 album : *${r.album}*` : null,
        audioFile.quality ? `𖦹 quality : *${audioFile.quality}*` : null,
      ]
        .filter(Boolean)
        .join('\n')

      // Cover + info first (optional: a failure here must not block the audio).
      if (cover) {
        await sock.sendMessage(m.chat, { image: { url: cover }, caption }, { quoted: m }).catch((err) => {
          console.error('[spotify] cover failed:', err.message)
        })
      } else {
        await reply(caption).catch(console.error)
      }

      await sock.sendMessage(
        m.chat,
        {
          audio,
          mimetype: 'audio/mpeg',
          fileName: `${r.title}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: r.title,
              body: r.artist,
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
      await reply(mess.error).catch(console.error)
    }
  },
}
