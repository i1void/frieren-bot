export default {
  usage: ['wame'],
  use: 'text',
  category: 'group',
  execute: async ({ m, text, reply }) => {
    // reply to someone to get their link, otherwise it is yours
    const jid = m.quoted ? m.quoted.sender : m.senderPn || m.sender
    if (!jid || !jid.endsWith('@s.whatsapp.net')) {
      return reply("❌ Couldn't get that person's phone number.")
    }
    const number = jid.split('@')[0]
    reply(`https://wa.me/${number}?text=${encodeURIComponent(text || 'hai')}`)
  },
}
