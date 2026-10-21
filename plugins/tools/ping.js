const { runtime } = require('../../lib/myfunc')

module.exports = {
  usage: ['ping'],
  category: 'tools',
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
