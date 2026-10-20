const { db, transaction } = require('./database')

const GROUP_LINK_REGEX = /https?:\/\/(chat\.whatsapp\.com|wa\.me|www\.whatsapp\.com\/invite)\/[a-zA-Z0-9]+/i

const numberOf = (jid) => String(jid).split('@')[0]

const listAll = db.prepare('SELECT chat FROM antilink ORDER BY rowid')
const isEnabled = db.prepare('SELECT 1 FROM antilink WHERE chat = ?')
const clear = db.prepare('DELETE FROM antilink')
const add = db.prepare('INSERT OR IGNORE INTO antilink (chat) VALUES (?)')

// Chat ids that have antilink switched on.
const readAntiLinkSettings = () => listAll.all().map((row) => row.chat)

function writeAntiLinkSettings(chats) {
  transaction(() => {
    clear.run()
    for (const chat of chats) add.run(chat)
  })
}

function isWhatsAppGroupLink(message) {
  return GROUP_LINK_REGEX.test(message)
}

// Returns true when the message was handled (the sender was removed).
// Does nothing when the sender is an admin or when the bot is not an admin itself
// (it could not remove anyone anyway).
async function handleAntiLink(conn, m, from) {
  if (isEnabled.get(from) === undefined) return false
  if (!isWhatsAppGroupLink(m.text)) return false

  try {
    const { participants } = await conn.groupMetadata(from)
    const isAdmin = (jid) => participants.some((p) => p.admin && numberOf(p.id) === numberOf(jid))

    if (isAdmin(m.sender)) return false
    if (!isAdmin(conn.decodeJid(conn.user.id))) return false

    await conn.sendMessage(from, { delete: m.key }).catch(() => {})
    await conn.groupParticipantsUpdate(from, [m.sender], 'remove')
    await conn.sendMessage(from, {
      text: `@${numberOf(m.sender)} was removed for sending a group invite link`,
      mentions: [m.sender],
    })
    return true
  } catch (err) {
    console.error('Error handling antilink:', err)
    return false
  }
}

module.exports = { readAntiLinkSettings, writeAntiLinkSettings, handleAntiLink }
