export default {
  usage: ['ava'],
  use: 'mention or reply',
  category: 'group',
  execute: async ({ sock, m, mentionedJid, reply }) => {
    const target = mentionedJid[0] || m.senderPn || m.sender
    const url = await sock.profilePictureUrl(target, 'image').catch(() => null)
    if (!url) return reply("❌ Target doesn't have a profile picture (or it is hidden).")
    await sock.sendMessage(m.chat, { image: { url } }, { quoted: m })
  },
}
