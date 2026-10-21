const { isAntiLinkEnabled } = require('../../lib/antilink')

const GROUP_LINK = /https?:\/\/(chat\.whatsapp\.com|wa\.me|www\.whatsapp\.com\/invite)\/[a-zA-Z0-9]+/i
const numberOf = (jid) => String(jid).split('@')[0]

// Deletes group invite links and removes the sender, in groups where "antilink on" was used.
// Admins are left alone, and so is everyone when the bot is not an admin (it could not remove anyone).
module.exports = {
  name: 'anti-link',
  event: true,
  groupOnly: true,
  execute: async ({ sock, m }) => {
    if (!GROUP_LINK.test(m.text || '') || !isAntiLinkEnabled(m.chat)) return false

    const { participants } = await sock.groupMetadata(m.chat)
    const isAdmin = (jid) => participants.some((p) => p.admin && numberOf(p.id) === numberOf(jid))
    if (isAdmin(m.sender) || !isAdmin(sock.decodeJid(sock.user.id))) return false

    await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    await sock.sendMessage(m.chat, {
      text: `@${numberOf(m.sender)} was removed for sending a group invite link`,
      mentions: [m.sender],
    })
    return true // handled: nothing else runs for this message
  },
}
