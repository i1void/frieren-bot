import { db, transaction } from './sqlite.js'

const all = db.prepare('SELECT name FROM disabled_plugins ORDER BY rowid')
const clear = db.prepare('DELETE FROM disabled_plugins')
const add = db.prepare('INSERT OR IGNORE INTO disabled_plugins (name) VALUES (?)')

const getDisabledPlugins = () => all.all().map((row) => row.name)

const isPluginDisabled = (plugin, disabled = getDisabledPlugins()) =>
  disabled.some((name) => name === plugin.name || plugin.commands.includes(name))

const allCommands = db.prepare('SELECT name FROM disabled_commands ORDER BY rowid')
const addCommand = db.prepare('INSERT OR IGNORE INTO disabled_commands (name) VALUES (?)')
const removeCommand = db.prepare('DELETE FROM disabled_commands WHERE name = ?')

const getDisabledCommands = () => allCommands.all().map((row) => row.name)
const setCommandDisabled = (name, off) => (off ? addCommand.run(name) : removeCommand.run(name))

const readSetting = db.prepare('SELECT value FROM bot_settings WHERE name = ?')
const writeSetting = db.prepare(
  'INSERT INTO bot_settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value'
)

const getSetting = (name) => readSetting.get(name)?.value
const setSetting = (name, value) => writeSetting.run(name, String(value))
const deleteSetting = db.prepare('DELETE FROM bot_settings WHERE name = ?')
const clearSetting = (name) => deleteSetting.run(name)

const isGroupMode = () => readSetting.get('groupmode')?.value === '1'
const setGroupMode = (on) => writeSetting.run('groupmode', on ? '1' : '0')

const isNoPrefix = () => readSetting.get('noprefix')?.value === '1'
const setNoPrefix = (on) => writeSetting.run('noprefix', on ? '1' : '0')

const setDisabledPlugins = (names) =>
  transaction(() => {
    clear.run()
    for (const name of names) add.run(name)
  })

export {
  getSetting,
  setSetting,
  clearSetting,
  getDisabledCommands,
  setCommandDisabled,
  isGroupMode,
  setGroupMode,
  isNoPrefix,
  setNoPrefix,
  getDisabledPlugins,
  isPluginDisabled,
  setDisabledPlugins,
}
