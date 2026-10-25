module.exports = {
  usage: ['tagall'],
  use: 'teks',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ groupMetadata, text, reply }) => {
    if (!groupMetadata) return reply('Failed to fetch group info, please try again.')
    const list = groupMetadata.participants.map((p) => p.id)
    const teks = list.map((v) => `@${v.split('@')[0]}`).join(' ')
    reply(`${text ? text + '\n\n' : ''}${teks}`, { mentions: list })
  },
}
