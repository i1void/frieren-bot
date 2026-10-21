// Bot-wide settings, stored in bot.db (see lib/database.js).
const { db, transaction } = require('./database')

const all = db.prepare('SELECT name FROM disabled_plugins ORDER BY rowid')
const clear = db.prepare('DELETE FROM disabled_plugins')
const add = db.prepare('INSERT OR IGNORE INTO disabled_plugins (name) VALUES (?)')

const getDisabledPlugins = () => all.all().map((row) => row.name)

// True when the plugin is switched off. A saved name also counts when it is one of the
// plugin's aliases, so a plugin that was renamed later (tiktok -> tt) stays switched off.
const isPluginDisabled = (plugin, disabled = getDisabledPlugins()) =>
  disabled.some((name) => name === plugin.name || plugin.aliases.includes(name))

module.exports = {
  // Names of plugins the owner switched off with the "plugin" command.
  getDisabledPlugins,
  isPluginDisabled,
  setDisabledPlugins: (names) =>
    transaction(() => {
      clear.run()
      for (const name of names) add.run(name)
    }),
}
