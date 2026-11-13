import { getMenuStyle, setMenuStyle } from '../../lib/settings.js'

export default {
  usage: ['setmenu'],
  use: '1/2/3',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ prefix, command, args, reply }) => {
    const style = args[0]
    if (!['1', '2', '3'].includes(style)) {
      return reply(
        `Menu style: *${getMenuStyle()}*\n\n` +
          '*1* : full list of all commands\n' +
          '*2* : categories only, open one with menu <category>\n' +
          '*3* : interactive list, tap to pick a category\n\n' +
          `Example: ${prefix}${command} 2`
      )
    }
    setMenuStyle(style)
    reply(`✅ Menu style set to *${style}*.`)
  },
}
