// Media helpers: download WhatsApp media and turn images/videos into stickers.
const fs = require('fs')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./exif')

// Accepts a quoted message (m.quoted), a serialized message (m) or a raw media message.
// Baileys needs the media content itself (url / mediaKey / directPath). For a
// serialized message that is `m.msg`, not `m`.
async function downloadMedia(message) {
  const content = message.msg || message
  const mime = content.mimetype || ''
  const fromType = message.mtype && !/^viewOnce/.test(message.mtype) ? message.mtype.replace(/Message/gi, '') : ''
  const stream = await downloadContentFromMessage(content, fromType || mime.split('/')[0])
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// exif.js returns either a Buffer or the path of a temp file. Always hand back a
// Buffer and delete the temp file so /tmp does not fill up.
async function toBuffer(result) {
  if (Buffer.isBuffer(result)) return result
  const buffer = await fs.promises.readFile(result)
  await fs.promises.unlink(result).catch(() => {})
  return buffer
}

const hasMeta = (meta) => Boolean(meta.packname || meta.author)

async function imageToSticker(buffer, meta = {}) {
  return toBuffer(hasMeta(meta) ? await writeExifImg(buffer, meta) : await imageToWebp(buffer))
}

async function videoToSticker(buffer, meta = {}) {
  return toBuffer(hasMeta(meta) ? await writeExifVid(buffer, meta) : await videoToWebp(buffer))
}

module.exports = { downloadMedia, imageToSticker, videoToSticker }
