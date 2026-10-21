// Which groups have antilink switched on (the check itself is in plugins/events/anti_link.js).
const { db, transaction } = require('./database')

const listAll = db.prepare('SELECT chat FROM antilink ORDER BY rowid')
const find = db.prepare('SELECT 1 FROM antilink WHERE chat = ?')
const clear = db.prepare('DELETE FROM antilink')
const add = db.prepare('INSERT OR IGNORE INTO antilink (chat) VALUES (?)')

// Chat ids that have antilink switched on.
const readAntiLinkSettings = () => listAll.all().map((row) => row.chat)

const isAntiLinkEnabled = (chat) => find.get(chat) !== undefined

function writeAntiLinkSettings(chats) {
  transaction(() => {
    clear.run()
    for (const chat of chats) add.run(chat)
  })
}

module.exports = { readAntiLinkSettings, writeAntiLinkSettings, isAntiLinkEnabled }
