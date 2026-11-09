## FRIEREN-BOT (Base)

> Frieren-Bot is an open source base WhatsApp bot built with Baileys.
> ⭐ Don't forget to star this repo if you find it useful!

[![GitHub stars](https://img.shields.io/github/stars/i1void/frieren-bot?style=flat-square&color=ff5e5b)](https://github.com/i1void/frieren-bot/stargazers) [![GitHub forks](https://img.shields.io/github/forks/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/network/members) [![License](https://img.shields.io/github/license/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/blob/main/LICENSE)

### # Features

- Downloader 
- Sticker maker + converter
- Media converter (to mp3, to voice note)
- Group management (kick, promote, tagall, antilink, welcome message, etc)
- Owner tools (ban, premium, limit, broadcast, enable/disable commands, database `backup` / `restore`)
- Plugin system: one file per command, menu is generated automatically
- Menfess: anonymous two-way messages through the bot
- Anti-spam for commands (warning, then a temporary block) and "Did you mean ...?" with a number reply

### # How To

```
# Clone repository
git clone https://github.com/i1void/frieren-bot.git
cd frieren-bot

# Install dependencies
npm install

# Create your .env and fill in API_KEY
cp .env.example .env

# Run the bot
npm start
```

On first run, enter your WhatsApp number when prompted, then input the pairing code shown in the console into WhatsApp > Linked Devices > Link with phone number.

### # Requirements

- Node.js 22.13 or newer. Data is stored with the built-in `node:sqlite`, so there is no database package to install.
- The project is pure ES modules (`"type": "module"`): plugins use `export default { ... }`, and relative imports need the `.js` extension (`import x from './lib/x.js'`). For development, `npm run dev` restarts the bot when a file changes.

### # Database

Everything (users and limits, premium, bans, welcome texts, antilink, disabled commands) lives in one SQLite file: `storage/database/bot.db`. While the bot runs, `bot.db-wal` and `bot.db-shm` appear next to it. To back up, stop the bot and copy all three.

Upgrading from the old JSON files: just start the bot. They are imported once and the originals are moved to `storage/database/json-backup/`.

### # Config

Configuration consists of two files: `config.json` and `.env`.

`config.json`: bot number, owner, prefixes, sticker pack/author name, free/premium limit.

Optional keys:

- `logChat: false` — turn off the one-line-per-message log in the console
- `antiSpam` — `cooldown` seconds between commands per user (owner is exempt, `0` = off). Commands sent too soon are ignored; after `warnAt` of them the user gets a warning, after `blockAt` they are blocked for `blockMinutes`

### # Environment (.env)

```env
### Void API : https://api.i1void.is-a.dev
API_KEY=

# Optional: your own free key from https://ocr.space/ocrapi for .ocr
OCR_API_KEY=

# Timezone (default Asia/Jakarta)
TZ=Asia/Jakarta
```

### # Structure

- `index.js` — WhatsApp connection and event wiring
- `handler.js` — command router
- `plugins/` — one file per command, one folder per menu section
- `lib/` — helpers, one topic per file:
  - `sqlite.js` (database connection), `limits.js` (user limits), `access.js` (ban and premium), `settings.js` (bot settings), `group.js`, `welcome.js`, `antilink.js`, `antispam.js`, `menfess.js`
  - `message.js` (message serializer + chat log), `utils.js` (small helpers), `http.js`, `media.js`, `convert.js`, `exif.js`, `quote.js`, `suggest.js`, `uploadFile.js`
  - `pluginLoader.js` (finds and registers plugins), `globals.js` (global `Api` and `mess`), `quietLogs.js` (hides noisy libsignal logs), `baileys.js` and `fileType.js` (one import point for those packages)
- `storage/` — database & media

### # Run with PM2 (recommended)

```
npm i -g pm2
pm2 start ecosystem.config.cjs
```

The owner `restart` command only works properly under a process manager like this.

### # Add a command

Create `plugins/<folder>/<name>.js` (copy `plugins/_template.js`) and restart the bot.
It appears in the menu by itself, even inside a brand new category folder.

The menu builds itself from the plugins: the section is the `category`, each name in `usage` becomes a line `name use`, sorted A-Z. Names in `hidden` work as commands but are not listed. Commands switched off with the `plugin` command disappear from the menu too. If every name is in `hidden` (use `usage: []`), the plugin is not in the menu at all.

```js
export default {
  usage: ['hello', 'hi'], // command names, listed in the menu
  hidden: ['halo'], // optional: work, but not listed
  use: 'name', // optional: argument hint in the menu
  category: 'utilities', // menu section
  // optional: ownerOnly, groupOnly, adminOnly, botAdmin, limit
  execute: async ({ reply, text }) => reply(`Hello ${text}`),
}
```

Available in the argument: `sock, m, config, command, args, text, prefix, reply, sleep, mentionedJid,
user, isOwner, isPremium, isGroup, isAdmin, isBotAdmin, groupMetadata, groupAdmins, useLimit, refundLimit`.

For commands that cost limit, call `useLimit()` after checking the arguments and `refundLimit()` if the job fails.
A broken plugin or a duplicate command name is skipped and reported in the console; the bot keeps running.

### # Event plugins

An event plugin runs on every message, not on a command. Put it in `plugins/_events/` with `event: true`. Return `true` when the message is handled, and nothing else runs for it (see `plugins/_events/anti_link.js`).

```js
export default {
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

### # Deploy

Works on any VPS with Node.js 22.13+ and FFmpeg installed. Run with PM2 for auto-restart on crash.

> [!DISCLAIMER]
> Built on Baileys, an unofficial WhatsApp Web API. Using it may violate WhatsApp's Terms of Service and can result in account restrictions or bans. Use at your own risk.
