// Bot-wide settings, stored in bot.db (see lib/database.js).
const { db, transaction } = require('./database')

const all = db.prepare('SELECT name FROM disabled_plugins ORDER BY rowid')
const clear = db.prepare('DELETE FROM disabled_plugins')
const add = db.prepare('INSERT OR IGNORE INTO disabled_plugins (name) VALUES (?)')

module.exports = {
  // Names of plugins the owner switched off with the "plugin" command.
  getDisabledPlugins: () => all.all().map((row) => row.name),
  setDisabledPlugins: (names) =>
    transaction(() => {
      clear.run()
      for (const name of names) add.run(name)
    }),
}
