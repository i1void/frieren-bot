## FRIEREN BOT (Base)

> Base WhatsApp bot built with Baileys.
> ⭐ Don't forget to star this repo if you find it useful!

[![GitHub stars](https://img.shields.io/github/stars/i1void/frieren-bot?style=flat-square&color=ff5e5b)](https://github.com/i1void/frieren-bot/stargazers) [![GitHub forks](https://img.shields.io/github/forks/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/network/members) [![License](https://img.shields.io/github/license/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/blob/main/LICENSE)

### # Features

- Downloader (YouTube, TikTok, Instagram, Facebook)
- Sticker maker + converter (image/video to sticker, sticker to image)
- Media converter (to mp3, to voice note)
- Group management (kick, promote, tagall, antilink, welcome message, etc)
- Owner tools (ban, premium, limit, broadcast, enable/disable commands)
- Plugin system: one file per command, menu is generated automatically
- Anti-spam for commands (warning, then a temporary block) and "Did you mean ...?" with a number reply

### # How To

```
# Clone repository
git clone https://github.com/i1void/frieren-bot.git
cd frieren-bot

# Install dependencies
npm install

# Run the bot
npm start
```

On first run, enter your WhatsApp number when prompted, then input the pairing code shown in the console into WhatsApp > Linked Devices > Link with phone number.

### # Requirements

- Node.js 22.13 or newer. Data is stored with the built-in `node:sqlite`, so there is no database package to install.

### # Database

Everything (users and limits, premium, bans, welcome texts, antilink, disabled commands) lives in one SQLite file: `storage/database/bot.db`. While the bot runs, `bot.db-wal` and `bot.db-shm` appear next to it. To back up, stop the bot and copy all three.

Upgrading from the old JSON files: just start the bot. They are imported once and the originals are moved to `storage/database/json-backup/`.

### # YouTube downloads (yt-dlp)

`ytmp3`, `ytmp4` and `play` use [yt-dlp](https://github.com/yt-dlp/yt-dlp). It is not an npm package, so install it on the server once:

```
pip install -U "yt-dlp[default]"   # or download the standalone binary from the yt-dlp releases page
yt-dlp --version
```

YouTube changes its site often. If downloads suddenly fail, update first (`yt-dlp -U` or `pip install -U "yt-dlp[default]"`): most breakages are fixed upstream within days. The bot lets yt-dlp use the Node.js it runs on as the JavaScript runtime YouTube needs, and FFmpeg comes from the bundled package. Length, size, quality and parallel-download limits are under `youtube` in `config.js`.

### # Config

All settings live in `config.js`: bot number, owner, prefixes, sticker pack/author name, free/premium limit.

Optional keys:

- `timezone` — daily limit reset at 00:00 in this timezone (default `Asia/Jakarta`)
- `logChat: false` — turn off the one-line-per-message log in the console
- `antiSpam` — `cooldown` seconds between commands per user (owner is exempt, `0` = off). Commands sent too soon are ignored; after `warnAt` of them the user gets a warning, after `blockAt` they are blocked for `blockMinutes`
- `apiBase` — base URL of the API used by the downloader plugins

### # Structure

- `index.js` — WhatsApp connection
- `handler.js` — command router
- `plugins/` — one file per command (`plugins/events/` holds event plugins)
- `lib/` — helper functions
- `storage/` — database & media

### # Run with PM2 (recommended)

```
npm i -g pm2
pm2 start ecosystem.config.js
```

The owner `restart` command only works properly under a process manager like this.

### # Add a command

Create `plugins/<category>/<name>.js` (copy `plugins/_template.js`) and restart the bot.
It appears in the menu by itself, even inside a brand new category folder.

The menu builds itself from the plugins: the section is the `category`, the line is `name usage`, sorted A-Z. `hidden: true` keeps a command out of the menu, and commands switched off with the `plugin` command disappear from it too.

```js
module.exports = {
  name: 'hello',
  aliases: ['hi'],
  category: 'tools', // menu section
  usage: '<name>', // shown in the menu
  // optional: ownerOnly, groupOnly, adminOnly, botAdmin, hidden
  execute: async ({ reply, text }) => reply(`Hello ${text}`),
}
```

Available in the argument: `sock, m, config, command, args, text, prefix, reply, sleep, mentionedJid,
user, isOwner, isPremium, isGroup, isAdmin, isBotAdmin, groupMetadata, groupAdmins, useLimit, refundLimit`.

For commands that cost limit, call `useLimit()` after checking the arguments and `refundLimit()` if the job fails.
A broken plugin or a duplicate command name is skipped and reported in the console; the bot keeps running.

### # Event plugins

An event plugin runs on every message, not on a command. Put it in `plugins/events/` with `event: true`. Return `true` when the message is handled, and nothing else runs for it (see `plugins/events/anti_link.js`).

```js
module.exports = {
  name: 'my-event',
  event: true,
  groupOnly: true, // optional: groups only
  execute: async ({ sock, m, store, config }) => {
    if (m.text === 'ping?') {
      await sock.sendMessage(m.chat, { text: 'pong!' }, { quoted: m })
      return true
    }
  },
}
```

### # Owner commands

- `.plugin` — list commands, `.plugin off <cmd>` / `.plugin on <cmd>` to disable / enable one
- `.botstatus` — uptime, memory, groups, users, command count
- `.ban` `.unban` `.addprem` `.delprem` `.listprem` `.addlimit` `.broadcast` `.join` `.setbio` `.restart`

### # Deploy

Works on any VPS with Node.js 22.13+ and FFmpeg installed. Run with PM2 for auto-restart on crash.

> [!DISCLAIMER]
> Built on Baileys, an unofficial WhatsApp Web API. Using it may violate WhatsApp's Terms of Service and can result in account restrictions or bans. Use at your own risk.
