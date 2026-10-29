// Turns a WhatsApp Channel link into its ID, for `channelJid` in config.json.
module.exports = {
  usage: ['checkid'],
  hidden: ['checklid'],
  use: 'channel link',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, text, prefix, command, reply }) => {
    const code = text.match(/whatsapp\.com\/channel\/([\w-]+)/i)?.[1]
    if (!code) return reply(`Example: ${prefix}${command} https://whatsapp.com/channel/xxxx`)

    try {
      const { id, name } = await sock.newsletterMetadata('invite', code)
      reply(`*${name}*\n${id}`)
    } catch (err) {
      console.error('[checkid]', err)
      await reply('Channel not found. Check the link and try again.').catch(console.error)
    }
  },
}
