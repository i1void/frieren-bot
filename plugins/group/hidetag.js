module.exports = {
  usage: ['hidetag'],
  use: 'teks',
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ groupMetadata, text, reply }) => {
    if (!groupMetadata) return reply('Failed to fetch group info, please try again.')
    const list = groupMetadata.participants.map((p) => p.id)
    reply(text || '\u200e', { mentions: list }) // U+200E: invisible placeholder when no text is given
  },
}
