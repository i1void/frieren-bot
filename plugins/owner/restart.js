module.exports = {
  name: 'restart',
  aliases: [],
  category: 'owner',
  description: 'Restart the bot (needs PM2 or similar to come back)',
  ownerOnly: true,
  execute: async ({ reply }) => {
    await reply('♻️ Restarting bot...')
    process.exit(0)
  },
}
