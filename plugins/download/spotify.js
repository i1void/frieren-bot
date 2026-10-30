const { fromBuffer } = require('file-type')
const { fetchBuffer } = require('../../lib/http')
const { convertToMp3Tagged } = require('../../lib/convert')

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

      let audio = await fetchBuffer(audioFile.url, { timeout: 120000 })
      if (!audio?.length) throw new Error('Empty audio response')
      if (audio.length > MAX_MB * 1024 * 1024) {
        refundLimit()
        return reply(`Audio too large (max ${MAX_MB} MB).`)
      }

      // Always re-encode to a clean MP3 (odd containers from the source can make WhatsApp
      // upload fine but never deliver), and embed cover + ID3 tags.
      const type = await fromBuffer(audio).catch(() => null)
      if (type && !/^(audio|video)\//.test(type.mime)) {
        throw new Error(`Download is not an audio file (${type.mime})`)
      }

      // Cover is optional: if it fails to download, the song is still sent (just without art).
      const coverUrl = r.downloads.find((d) => d.type === 'image')?.url || r.thumbnail
      const cover = coverUrl ? await fetchBuffer(coverUrl, { timeout: 30000 }).catch(() => null) : null
      audio = await convertToMp3Tagged(audio, { cover, title: r.title, artist: r.artist, album: r.album })

      await sock.sendMessage(
        m.chat,
        {
          audio,
          mimetype: 'audio/mpeg',
          fileName: `${r.title}.mp3`,
        },
        { quoted: m }
      )
    } catch (err) {
      console.error('[spotify]', err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
