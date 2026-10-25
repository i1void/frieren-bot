const { db } = require('../../lib/database')

// Lets users post to the bot's WhatsApp Channel through the bot.
// Needs `channelJid` in config.js (the bot's number must be the owner/admin of that channel).
db.exec(`
  CREATE TABLE IF NOT EXISTS channel_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    created_at INTEGER NOT NULL
  )
`)
const insertPost = db.prepare('INSERT INTO channel_posts (sender, type, content, created_at) VALUES (?, ?, ?, ?)')
const lastPosts = db.prepare('SELECT * FROM channel_posts ORDER BY id DESC LIMIT 10')

const MAX_TEXT = 1000
const MAX_VIDEO_BYTES = 20 * 1024 * 1024
const COOLDOWN = 60 * 1000 // per user, the owner is exempt
const lastPost = new Map()

// Non-owners may not advertise: WhatsApp links, wa.me, or anything that looks like a phone number.
const CONTACT = /wa\.me|whatsapp\.com|(?:\+?\d[\s().-]*){9,}/i

const RULES =
  `*CHANNEL*\n\n` +
  `• *channel* : menampilkan menu ini\n` +
  `• *sendtext <teks>* : kirim teks ke channel lewat bot\n` +
  `• *sendmedia <caption>* : kirim foto/video ke channel (kirim atau reply medianya)\n\n` +
  `*ATURAN:*\n` +
  `- Dilarang mengirim media berbau pornografi atau konten kekerasan.\n` +
  `- Dilarang mengirim hal yang bersifat SARA maupun rasis.\n` +
  `- Dilarang menyebarkan nomor/kontak dan link grup (kecuali lewat owner).\n\n` +
  `Pelanggar akan di-ban dari bot tanpa toleransi. Semua kiriman tercatat.`

function channelJid(config) {
  const id = String(config.channelJid || '').trim()
  if (!id) return null
  return id.includes('@') ? id : `${id}@newsletter`
}

module.exports = {
  usage: ['channel', 'sendtext', 'sendmedia'],
  use: '',
  category: 'others',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, isOwner, useLimit, refundLimit }) => {
    if (command === 'channel') {
      // Owner only: who posted what recently (abuse handling).
      if (isOwner && text.trim().toLowerCase() === 'log') {
        const rows = lastPosts.all()
        if (!rows.length) return reply('Belum ada kiriman.')
        return reply(
          '*10 KIRIMAN TERAKHIR*\n\n' +
            rows.map((r) => `#${r.id} • wa.me/${r.sender.split('@')[0]} • ${r.type}\n${String(r.content || '-').slice(0, 80)}`).join('\n\n')
        )
      }
      return reply(RULES)
    }

    const jid = channelJid(config)
    if (!jid) return reply('Fitur channel belum diatur. Owner: isi `channelJid` di config.js.')

    const sender = m.sender
    if (!isOwner) {
      const wait = (lastPost.get(sender) || 0) + COOLDOWN - Date.now()
      if (wait > 0) return reply(`Tunggu ${Math.ceil(wait / 1000)} detik lagi sebelum mengirim ke channel.`)
    }
    if (!isOwner && CONTACT.test(text)) {
      return reply('*「 AKSES DITOLAK 」*\n\nTidak boleh membagikan nomor, kontak, atau link grup. Mau promosi? Hubungi owner.')
    }

    if (command === 'sendtext') {
      if (!text) return reply(`Teksnya mana?\n\nContoh: ${prefix}sendtext halo semua`)
      if (text.length > MAX_TEXT) return reply(`Teks terlalu panjang (maksimal ${MAX_TEXT} karakter).`)
      if (!useLimit()) return
      try {
        await sock.sendMessage(jid, { text })
        insertPost.run(sender, 'text', text, Date.now())
        lastPost.set(sender, Date.now())
        reply('✅ Berhasil dikirim ke channel.')
      } catch (err) {
        console.error('[channel]', err)
        refundLimit()
        reply(config.messages.error)
      }
      return
    }

    // sendmedia: the photo/video is either quoted or sent together with the command.
    const target = m.quoted?.mimetype ? m.quoted : m
    const info = target.msg || target
    const mime = info.mimetype || ''
    const isImage = /^image\//.test(mime)
    const isVideo = /^video\//.test(mime)
    if (!isImage && !isVideo) return reply(`Kirim atau reply foto/video dengan caption ${prefix}sendmedia <caption>`)
    if (text.length > MAX_TEXT) return reply(`Caption terlalu panjang (maksimal ${MAX_TEXT} karakter).`)
    const size = Number(String(info.fileLength))
    if (isVideo && size > MAX_VIDEO_BYTES) return reply('Video terlalu besar (maksimal 20 MB).')

    if (!useLimit()) return
    try {
      await reply(config.messages.wait)
      const buffer = await sock.downloadMediaMessage(target)
      await sock.sendMessage(jid, isImage ? { image: buffer, caption: text } : { video: buffer, caption: text })
      insertPost.run(sender, isImage ? 'image' : 'video', text, Date.now())
      lastPost.set(sender, Date.now())
      reply('✅ Berhasil dikirim ke channel.')
    } catch (err) {
      console.error('[channel]', err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
