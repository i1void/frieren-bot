// PM2 config: `pm2 start ecosystem.config.js`. The owner "restart" command relies on this
// (or any process manager) to bring the bot back after it exits. 
module.exports = {
  apps: [
    {
      name: 'frieren-bot',
      script: 'index.js',
      autorestart: true,
      restart_delay: 3000,
      max_memory_restart: '500M',
    },
  ],
}
