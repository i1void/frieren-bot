// This bot stores its data with node:sqlite, which needs Node.js 22.13 or newer.
// Checked first, before anything else is loaded, so an old Node gets a clear message instead of a stack trace.
{
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 22 || (major === 22 && minor < 13)) {
    console.error(
      `\n❌ This bot requires Node.js 22.13 or newer.\n` +
        `   You are using Node.js ${process.versions.node}.\n` +
        `   Please upgrade Node.js, then run the bot again.\n`
    )
    process.exit(1)
  }
}

// Load .env (API_KEY). Built into Node 22, no package needed. Missing file is fine.
try {
  process.loadEnvFile()
} catch {}
require('./lib/config') // globals: Api (void API client) and mess (reply messages)

const {
  default: makeWASocket,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  jidDecode,
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const chalk = require('chalk')
const readline = require('readline')
const qrcode = require('qrcode-terminal')
const { Boom } = require('@hapi/boom')
const config = require('./config')
const { smsg, logMessage } = require('./lib/myfunc')
const { welcomeHandler } = require('./lib/welcome')
const { loadPlugins } = require('./lib/pluginLoader')
const { startRentWatcher } = require('./lib/group')
const { downloadMedia, imageToSticker, videoToSticker } = require('./lib/media')

const store = { contacts: {} }

const logger = pino({ level: 'silent' })

const question = (text) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(text, (answer) => {
      rl.close()
      resolve(answer)
    })
  })

function clearConsole() {
  console.clear()
}

// Big title (package "cfonts"). Plain text if it is not installed yet.
function showBanner() {
  try {
    const CFonts = require('cfonts')
    CFonts.say('FRIEREN BOT', { font: 'tiny', align: 'center', colors: ['system'] })
    CFonts.say('Github : https://github.com/i1void/frieren-bot', { font: 'console', align: 'center', colors: ['system'] })
  } catch {
    console.log(chalk.bold('FRIEREN BOT'))
  }
}

// Reconnect after a short pause so a failing connection cannot spin in a tight loop.
// The restart WhatsApp asks for right after pairing (restartRequired) happens at once.
function reconnect(reason) {
  const delay = reason === DisconnectReason.restartRequired ? 0 : 3000
  setTimeout(connectToWhatsApp, delay)
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(`session/${config.sessionName}`)

  const { version, isLatest } = await fetchLatestWaWebVersion()
  console.log(chalk.cyan(`Using WA v${version.join('.')}, isLatest: ${isLatest}`))

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    markOnlineOnConnect: true,
    browser: Browsers.ubuntu('Chrome'),
  })

  if (config.usePairingCode && !sock.authState.creds.registered) {
    clearConsole()
    let numberInput = config.botNumber
    if (!numberInput || numberInput.includes('X')) {
      numberInput = await question(
        'Enter WhatsApp bot number with country code, digits only, no + or spaces\n' +
          '(e.g. 14155552671 for US, 447911123456 for UK, 6281234567890 for Indonesia): '
      )
    }
    setTimeout(async () => {
      let code = await sock.requestPairingCode(numberInput.replace(/[^0-9]/g, ''))
      code = code?.match(/.{1,4}/g)?.join('-') || code
      console.log(chalk.green(`Pairing Code: ${code}`))
    }, 3000)
  }

  sock.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decoded = jidDecode(jid) || {}
      return (decoded.user && decoded.server && decoded.user + '@' + decoded.server) || jid
    }
    return jid
  }

  sock.getName = async (jid) => {
    const id = sock.decodeJid(jid)
    if (id.endsWith('@g.us')) {
      const meta = await sock.groupMetadata(id).catch(() => ({}))
      return meta.subject || id
    }
    return store.contacts[id]?.name || id.split('@')[0]
  }

  sock.downloadMediaMessage = downloadMedia

  sock.sendText = (jid, text, quoted, options = {}) =>
    sock.sendMessage(jid, { text, ...options }, { quoted })

  // 'file' is kept as an alias for 'document' since lib/myfunc.js's m.reply() uses it.
  sock.sendMedia = (jid, buffer, type = 'document', caption = '', quoted, options = {}) => {
    const key = type === 'file' ? 'document' : type
    return sock.sendMessage(jid, { [key]: buffer, caption, ...options }, { quoted })
  }

  sock.sendImage = async (jid, buffer, caption = '', quoted, options = {}) =>
    sock.sendMessage(jid, { image: buffer, caption, ...options }, { quoted })

  sock.sendImageAsSticker = async (jid, buffer, quoted, options = {}) => {
    const sticker = await imageToSticker(buffer, options)
    await sock.sendMessage(jid, { sticker }, { quoted })
    return sticker
  }

  sock.sendVideoAsSticker = async (jid, buffer, quoted, options = {}) => {
    const sticker = await videoToSticker(buffer, options)
    await sock.sendMessage(jid, { sticker }, { quoted })
    return sticker
  }

  sock.serializeM = (m) => smsg(sock, m, store)

  // Only live messages ("notify") are handled. "append" carries old history and
  // must never re-run commands. One upsert can hold several messages: handle all.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const mek of messages) {
      try {
        if (!mek.message) continue
        mek.message =
          Object.keys(mek.message)[0] === 'ephemeralMessage'
            ? mek.message.ephemeralMessage.message
            : mek.message
        if (mek.key?.remoteJid === 'status@broadcast') continue
        if (!config.isPublic && !mek.key.fromMe) continue
        if (mek.key.id?.startsWith('BAE5') && mek.key.id.length === 16) continue

        const m = smsg(sock, mek, store)
        if (!m) continue
        logMessage(sock, m)
        require('./handler')(sock, m, store)
      } catch (err) {
        console.error(err)
      }
    }
  })

  sock.ev.on('group-participants.update', async (update) => {
    try {
      await welcomeHandler(sock, update)
    } catch (err) {
      console.error('Error in group-participants.update:', err)
    }
  })

  sock.ev.on('contacts.update', (updates) => {
    for (const contact of updates) {
      const id = sock.decodeJid(contact.id)
      store.contacts[id] = { id, name: contact.notify }
    }
  })

  sock.public = config.isPublic

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    // Manual QR rendering (printQRInTerminal is deprecated in recent Baileys versions).
    if (qr && !config.usePairingCode) {
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      switch (reason) {
        case DisconnectReason.badSession:
          console.log(chalk.red('Session corrupted. Delete the session/ folder, then re-scan/pair.'))
          process.exit()
          break
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.restartRequired:
        case DisconnectReason.timedOut:
          console.log(chalk.yellow('Connection lost, reconnecting...'))
          reconnect(reason)
          break
        case DisconnectReason.connectionReplaced:
          console.log(chalk.red('Session is being used elsewhere. Restart this bot if this should be the active session.'))
          process.exit()
          break
        case DisconnectReason.loggedOut:
          console.log(chalk.red('Logged out from the device. Delete the session/ folder, then re-scan/pair.'))
          process.exit()
          break
        default:
          console.log(chalk.yellow(`Disconnected (${reason}), attempting to reconnect...`))
          reconnect(reason)
      }
    } else if (connection === 'open') {
      clearConsole()
      showBanner()
      console.log(chalk.green(`${config.botName} connected ✔`))
      startRentWatcher(sock)
    }
  })

  return sock
}

// A stray error in one handler must not take the whole bot down.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err))
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err))

showBanner()
loadPlugins()
connectToWhatsApp()
