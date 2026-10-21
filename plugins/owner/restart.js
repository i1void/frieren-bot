module.exports = {
  usage: ['restart'],
  category: 'owner',
  ownerOnly: true,
  execute: async ({ reply }) => {
    await reply('♻️ Restarting bot...')
    process.exit(0)
  },
}
