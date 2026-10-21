const { isAntiLinkEnabled } = require('../../lib/antilink')
const { getGroupAdmins } = require('../../lib/myfunc')

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
    const admins = getGroupAdmins(participants, sock.decodeJid)
    const botIds = [sock.user.id, sock.user.lid].filter(Boolean).map((jid) => sock.decodeJid(jid))
    if (admins.includes(m.sender) || !botIds.some((id) => admins.includes(id))) return false

    await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    await sock.sendMessage(m.chat, {
      text: `@${numberOf(m.sender)} was removed for sending a group invite link`,
      mentions: [m.sender],
    })
    return true // handled: nothing else runs for this message
  },
}
