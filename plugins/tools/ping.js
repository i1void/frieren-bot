const { runtime } = require('../../lib/myfunc')

module.exports = {
  name: 'ping',
  aliases: [],
  category: 'tools',
  description: 'Check latency and uptime',
  execute: async ({ sock, m, reply }) => {
    const start = Date.now()
    await reply('Pinging...')
    const latency = Date.now() - start
    await sock.sendMessage(
      m.chat,
      { text: `🏓 Pong! ${latency}ms\nUptime: ${runtime(process.uptime())}` },
      { quoted: m }
    )
  },
}
