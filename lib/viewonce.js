import { db } from './sqlite.js'

db.exec('CREATE TABLE IF NOT EXISTS viewonce (chat TEXT PRIMARY KEY)')

const find = db.prepare('SELECT 1 FROM viewonce WHERE chat = ?')
const add = db.prepare('INSERT OR IGNORE INTO viewonce (chat) VALUES (?)')
const remove = db.prepare('DELETE FROM viewonce WHERE chat = ?')

const isViewOnceEnabled = (chat) => find.get(chat) !== undefined

function setViewOnce(chat, on) {
  if (on) add.run(chat)
  else remove.run(chat)
}

// Downloads an image/video/audio message and sends it again as a normal (non view-once) message.
// Returns false when the message is not a supported media type.
async function revealMedia(sock, chat, media, quoted) {
  const mime = media?.mimetype || ''
  const kind = mime.split('/')[0]
  if (!['image', 'video', 'audio'].includes(kind)) return false

  const buffer = await sock.downloadMediaMessage(media)
  if (kind === 'audio') {
    await sock.sendMessage(chat, { audio: buffer, mimetype: mime, ptt: Boolean(media.ptt) }, { quoted })
  } else {
    await sock.sendMessage(chat, { [kind]: buffer, caption: media.caption || '' }, { quoted })
  }
  return true
}

export { isViewOnceEnabled, setViewOnce, revealMedia }
