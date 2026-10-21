module.exports = {
  name: 'setbio',
  aliases: [],
  category: 'owner',
  description: 'Change the bot bio',
  usage: '<teks>',
  ownerOnly: true,
  execute: async ({ sock, config, prefix, text, reply }) => {
    if (!text) return reply(`Example: ${prefix}setbio Hi, I'm a bot!`)
    await sock.updateProfileStatus(text)
    reply(config.messages.done)
  },
}
