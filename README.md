## FRIEREN-BOT (BASE)

> Frieren-Bot is an open source base WhatsApp bot built with Baileys.
> ⭐ Don't forget to star this repo if you find it useful!

[![Forks](https://img.shields.io/github/forks/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/network/members)
[![Stars](https://img.shields.io/github/stars/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/stargazers)
[![License](https://img.shields.io/github/license/i1void/frieren-bot?style=flat-square)](./LICENSE)
[![Issues](https://img.shields.io/github/issues/i1void/frieren-bot?style=flat-square)](https://github.com/i1void/frieren-bot/issues)

### ⌗ FEATURES

- Downloader
- Sticker maker + media converter
- Group management (antilink, welcome message, etc)
- Owner tools (ban, premium, limit, broadcast, database backup / restore)
- Menfess (anonymous two-way messages)
- Anti-spam
- Plugin system (ESM), the menu builds itself

### ⌗ REQUIREMENTS

- [x] NodeJS >= 22.13

### ⌗ CONFIGURATION

Settings live in two files: `config.json` and `.env`.

```Javascript
{
   "sessionName": "frieren",
   "usePairingCode": true, // Set to "false" to scan the QR code instead
   "botNumber": "62xxxxxxxxxx", // Your bot number (the console asks if left empty)
   "owner": ["62xxxxxxxxxx"],
   "ownerName": "Owner",
   "botName": "Frieren Bot",
   "packName": "Frieren",
   "authorName": "Void",
   "prefixes": ["#", ".", "!", "/"],
   "isPublic": true, // Set to "false" to only answer the bot's own number
   "antiSpam": { "cooldown": 3, "warnAt": 3, "blockAt": 5, "blockMinutes": 10 },
   "channelJid": "",
   "limit": { "free": 15, "premium": 10000 }, // Usage limit per day
   "countryCode": "62",
   "thumbnail": "" // Menu thumbnail link (optional). Empty = use storage/media/image/thumb.jpg
}
```

```.env
### REST API key (default: Void API : https://api.i1void.is-a.dev)
API_KEY=

### Optional : your own key from https://ocr.space/ocrapi
OCR_API_KEY=

### Timezone (Important)
TZ=Asia/Jakarta
```

> [!NOTE]
> You are not tied to Void API. Change `API_URL` in `lib/globals.js` to use another REST API, or call any REST API inside a plugin with `fetchJson` from `lib/http.js`.

### ⌗ HOW TO

```
$ git clone https://github.com/i1void/frieren-bot.git
$ cd frieren-bot
$ npm install
$ cp .env.example .env
$ npm start
```

On first run, enter the pairing code from the console in WhatsApp > Linked Devices > Link with phone number.

Run with PM2 (the owner `restart` command needs a process manager):

```
$ npm i -g pm2
$ pm2 start ecosystem.config.cjs && pm2 logs frieren-bot
```

> [!NOTE]
> All data is stored in one SQLite file: `storage/database/bot.db`.

### ⌗ ADD A COMMAND

Copy `plugins/_template.js` to `plugins/<folder>/<name>.js` and restart the bot. The folder name is the menu section, so a new folder creates a new section. For commands that run on every message, see `plugins/_events/anti_link.js`.

### ⌗ TROUBLESHOOTING

### 1. Baileys

This bot uses `@whiskeysockets/baileys` **7.0.0-rc13** (release candidate, pinned). All imports go through `lib/baileys.js`, so an upgrade only touches that file and `package.json`. Test on a spare number first.

### 2. Sharp (Error on Termux)

If `sharp` fails to install on Termux, install the WebAssembly build:

```bash
$ npm install --cpu=wasm32 sharp
```

> [!IMPORTANT]
> Built on Baileys, an unofficial WhatsApp Web API. Using it may violate WhatsApp's Terms of Service and can result in account restrictions or bans. Use at your own risk.
