// Bot-wide settings, stored in bot.db (see lib/database.js).
const { db, transaction } = require('./database')

const all = db.prepare('SELECT name FROM disabled_plugins ORDER BY rowid')
const clear = db.prepare('DELETE FROM disabled_plugins')
const add = db.prepare('INSERT OR IGNORE INTO disabled_plugins (name) VALUES (?)')

const getDisabledPlugins = () => all.all().map((row) => row.name)

// True when the plugin is switched off. A saved name also counts when it is any of the
// plugin's command names, so a plugin that was renamed later stays switched off.
const isPluginDisabled = (plugin, disabled = getDisabledPlugins()) =>
  disabled.some((name) => name === plugin.name || plugin.commands.includes(name))

// ---- Single commands switched off with .disable (a plugin can hold several commands) --------

const allCommands = db.prepare('SELECT name FROM disabled_commands ORDER BY rowid')
const addCommand = db.prepare('INSERT OR IGNORE INTO disabled_commands (name) VALUES (?)')
const removeCommand = db.prepare('DELETE FROM disabled_commands WHERE name = ?')

const getDisabledCommands = () => allCommands.all().map((row) => row.name)
const setCommandDisabled = (name, off) => (off ? addCommand.run(name) : removeCommand.run(name))

// ---- Plain on/off settings (bot_settings table) ------------------------------------

const readSetting = db.prepare('SELECT value FROM bot_settings WHERE name = ?')
const writeSetting = db.prepare(
  'INSERT INTO bot_settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value'
)

// Group mode: when on, the bot only answers commands in groups; private chat is for premium users and the owner.
const isGroupMode = () => readSetting.get('groupmode')?.value === '1'
const setGroupMode = (on) => writeSetting.run('groupmode', on ? '1' : '0')

module.exports = {
  getDisabledCommands,
  setCommandDisabled,
  isGroupMode,
  setGroupMode,
  // Names of plugins the owner switched off with the "plugin" command.
  getDisabledPlugins,
  isPluginDisabled,
  setDisabledPlugins: (names) =>
    transaction(() => {
      clear.run()
      for (const name of names) add.run(name)
    }),
}
