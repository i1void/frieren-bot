// Plugin loader.
// Finds, validates and registers plugins from /plugins.
// Plugins are loaded once at startup; there is intentionally no hot reload.
const fs = require('fs')
const path = require('path')

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')
const BOOLEAN_FLAGS = ['ownerOnly', 'groupOnly', 'adminOnly', 'botAdmin', 'limit']

let registry = { plugins: [], commands: new Map(), events: [] }

// Recursively collect *.js files. Anything starting with "_" or "." (file or
// folder) is ignored, so helpers can live in "_shared/" or "_helper.js".
function findPluginFiles(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...findPluginFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full)
  }
  return files
}

// "use" is the argument hint shown in the menu: one string for every command, or { command: 'hint' } per command.
const isUseHint = (v) =>
  typeof v === 'string' || (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'string'))

const isCommandName = (v) => typeof v === 'string' && v.trim() !== '' && !/\s/.test(v.trim())

// Returns an error message, or null when the plugin is valid.
function validatePlugin(plugin) {
  if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) {
    return 'module.exports must be a plugin object'
  }
  for (const field of ['usage', 'hidden']) {
    if (plugin[field] !== undefined && (!Array.isArray(plugin[field]) || !plugin[field].every(isCommandName))) {
      return `"${field}" must be an array of non-empty strings without spaces`
    }
  }
  if (!(plugin.usage || []).length && !(plugin.hidden || []).length) {
    return 'needs at least one command name in "usage" (listed in the menu) or "hidden" (works, not listed)'
  }
  if (typeof plugin.category !== 'string' || !plugin.category.trim()) {
    return '"category" must be a non-empty string'
  }
  if (typeof plugin.execute !== 'function') return '"execute" must be a function'
  for (const flag of BOOLEAN_FLAGS) {
    if (plugin[flag] !== undefined && typeof plugin[flag] !== 'boolean') {
      return `"${flag}" must be a boolean`
    }
  }
  if (plugin.use !== undefined && !isUseHint(plugin.use)) {
    return '"use" must be a string, or an object of strings keyed by command name'
  }
  return null
}

// Event plugins run on every message instead of on a command. Returns an error message, or null.
function validateEvent(plugin) {
  if (typeof plugin.name !== 'string' || !plugin.name.trim()) return '"name" must be a non-empty string'
  if (typeof plugin.execute !== 'function') return '"execute" must be a function'
  if (plugin.groupOnly !== undefined && typeof plugin.groupOnly !== 'boolean') return '"groupOnly" must be a boolean'
  return null
}

// Load every plugin under `dir`. Never throws: broken plugins are skipped and
// reported. On a duplicate command name the first plugin (sorted by path) wins.
function loadPlugins(dir = PLUGINS_DIR, logger = console) {
  const commands = new Map()
  const plugins = []
  const events = []
  const skipped = []
  const warnings = []

  const skip = (file, reason) => {
    skipped.push({ file, reason })
    logger.error(`[plugins] skipped ${file}: ${reason}`)
  }
  const warn = (message) => {
    warnings.push(message)
    logger.warn(`[plugins] ${message}`)
  }

  const files = findPluginFiles(dir).sort()

  for (const abs of files) {
    const file = path.relative(dir, abs).split(path.sep).join('/')

    let exported
    try {
      exported = require(abs)
    } catch (err) {
      skip(file, `failed to load (${err.message})`)
      continue
    }

    if (exported?.event === true) {
      const eventProblem = validateEvent(exported)
      if (eventProblem) skip(file, eventProblem)
      else if (events.some((e) => e.name === exported.name)) skip(file, `event "${exported.name}" is already registered`)
      else events.push(Object.freeze({ ...exported, groupOnly: exported.groupOnly === true, file }))
      continue
    }

    const problem = validatePlugin(exported)
    if (problem) {
      skip(file, problem)
      continue
    }

    // Command names: "usage" ones are listed in the menu, "hidden" ones only work. First one is the main name.
    const listed = []
    const unlisted = []
    for (const [raw, target] of [...(exported.usage || []).map((n) => [n, listed]), ...(exported.hidden || []).map((n) => [n, unlisted])]) {
      const cmd = raw.trim().toLowerCase()
      if (listed.includes(cmd) || unlisted.includes(cmd)) continue
      const owner = commands.get(cmd)
      if (owner) {
        warn(`command "${cmd}" in ${file} is already registered by ${owner.file}, ignored`)
        continue
      }
      target.push(cmd)
    }
    const names = [...listed, ...unlisted]
    if (!names.length) {
      skip(file, 'every command name is already registered by another plugin')
      continue
    }

    const plugin = {
      ...exported,
      name: names[0],
      commands: names,
      usage: listed,
      hidden: unlisted,
      use: typeof exported.use === 'object' && exported.use !== null ? exported.use : (exported.use || '').trim(),
      category: exported.category.trim().toLowerCase(),
      file,
    }
    for (const flag of BOOLEAN_FLAGS) plugin[flag] = exported[flag] === true
    Object.freeze(plugin)

    plugins.push(plugin)
    for (const cmd of names) commands.set(cmd, plugin)
  }

  registry = { plugins, commands, events }

  logger.log(
    `[plugins] loaded ${plugins.length} plugin(s), ${commands.size} command name(s), ${events.length} event(s), ${skipped.length} skipped`
  )
  return { loaded: plugins.length, commands: commands.size, skipped, warnings }
}

// Case-insensitive lookup by any command name (usage or hidden). Returns null when not found.
function getPlugin(command) {
  if (typeof command !== 'string') return null
  return registry.commands.get(command.trim().toLowerCase()) || null
}

function listPlugins() {
  return [...registry.plugins]
}

function listEvents() {
  return [...registry.events]
}

module.exports = { PLUGINS_DIR, loadPlugins, getPlugin, listPlugins, listEvents, validatePlugin }
