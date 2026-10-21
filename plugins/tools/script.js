module.exports = {
  usage: ['script'],
  category: 'tools',
  execute: async ({ config, reply }) =>
    reply(`*${config.botName}* is open source:\nhttps://github.com/i1void/frieren-bot\n\n⭐ Don't forget to star the repo!`),
}
