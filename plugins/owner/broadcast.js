module.exports = {
  name: 'broadcast',
  aliases: ['bc'],
  category: 'owner',
  description: 'Send a message to every group',
  usage: '<teks>',
  ownerOnly: true,
  execute: async ({ sock, config, prefix, text, reply, sleep }) => {
    if (!text) return reply(`Example: ${prefix}broadcast Announcement...`)
    try {
      const groups = await sock.groupFetchAllParticipating()
      const ids = Object.keys(groups)
      await reply(`📢 Sending broadcast to ${ids.length} groups...`)
      for (const id of ids) {
        await sock.sendMessage(id, { text: `📢 *Broadcast*\n\n${text}` }).catch(() => {})
        await sleep(700)
      }
    } catch (err) {
      console.error(err)
      reply(config.messages.error)
    }
  },
}
