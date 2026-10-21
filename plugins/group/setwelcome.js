const { setWelcome, setLeft } = require('../../lib/welcome')

module.exports = {
  usage: [],
  hidden: ['setwelcome', 'setleft'],
  use: 'text',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, config, prefix, command, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}${command} Welcome @user to @group!`)
    if (command === 'setwelcome') setWelcome(m.chat, text)
    else setLeft(m.chat, text)
    reply(config.messages.done)
  },
}
