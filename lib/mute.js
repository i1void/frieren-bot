// Which groups have the bot muted (the check itself is in handler.js, the toggle in plugins/group/mute.js).
const { db } = require('./database')

const find = db.prepare('SELECT 1 FROM muted_groups WHERE chat = ?')
const add = db.prepare('INSERT OR IGNORE INTO muted_groups (chat) VALUES (?)')
const remove = db.prepare('DELETE FROM muted_groups WHERE chat = ?')

const isMuted = (chat) => find.get(chat) !== undefined

function setMuted(chat, muted) {
  if (muted) add.run(chat)
  else remove.run(chat)
}

module.exports = { isMuted, setMuted }
