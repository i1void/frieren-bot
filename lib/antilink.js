import { db, transaction } from './sqlite.js'

const listAll = db.prepare('SELECT chat FROM antilink ORDER BY rowid')
const find = db.prepare('SELECT 1 FROM antilink WHERE chat = ?')
const clear = db.prepare('DELETE FROM antilink')
const add = db.prepare('INSERT OR IGNORE INTO antilink (chat) VALUES (?)')

const readAntiLinkSettings = () => listAll.all().map((row) => row.chat)

const isAntiLinkEnabled = (chat) => find.get(chat) !== undefined

function writeAntiLinkSettings(chats) {
  transaction(() => {
    clear.run()
    for (const chat of chats) add.run(chat)
  })
}

export { readAntiLinkSettings, writeAntiLinkSettings, isAntiLinkEnabled }
