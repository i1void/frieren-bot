const { readAntiLinkSettings, writeAntiLinkSettings } = require('../../lib/antilink')

module.exports = {
  name: 'antilink',
  aliases: [],
  category: 'group',
  description: 'Kick members who send group invite links',
  usage: 'on/off',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, prefix, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    const list = readAntiLinkSettings()
    if (mode === 'on') {
      if (!list.includes(m.chat)) list.push(m.chat)
      writeAntiLinkSettings(list)
      reply('✅ Antilink enabled in this group.')
    } else if (mode === 'off') {
      writeAntiLinkSettings(list.filter((v) => v !== m.chat))
      reply('✅ Antilink disabled in this group.')
    } else {
      reply(`Example: ${prefix}antilink on / ${prefix}antilink off`)
    }
  },
}
