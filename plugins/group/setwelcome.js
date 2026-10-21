const { setWelcome, setLeft } = require('../../lib/welcome')

module.exports = {
  name: 'setwelcome',
  aliases: ['setleft'],
  category: 'group',
  description: 'Set the welcome / goodbye text (@user, @group)',
  usage: '<text>',
  hidden: true, // not listed in the menu (it is a settings command)
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, config, prefix, command, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}${command} Welcome @user to @group!`)
    if (command === 'setwelcome') setWelcome(m.chat, text)
    else setLeft(m.chat, text)
    reply(config.messages.done)
  },
}
