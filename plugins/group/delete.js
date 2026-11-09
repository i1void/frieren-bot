export default {
  usage: ['delete'],
  hidden: ['del'],
  use: 'reply chat',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ sock, m, isBotAdmin, reply }) => {
    const q = m.quoted
    if (!q?.id) return reply('❌ Reply to the message you want to delete.')

    const botIds = [sock.user.id, sock.user.lid].filter(Boolean).map((jid) => sock.decodeJid(jid))
    const mine = botIds.includes(q.sender)
    if (!mine && !isBotAdmin) return reply(mess.botAdminNeeded)

    await sock.sendMessage(m.chat, {
      delete: { remoteJid: m.chat, fromMe: mine, id: q.id, ...(mine ? {} : { participant: q.sender }) },
    })
  },
}
