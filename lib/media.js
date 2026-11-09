import fs from 'node:fs'
import { downloadContentFromMessage } from './baileys.js'
import { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeStickerExif } from './exif.js'

async function downloadMedia(message) {
  const content = message.msg || message
  const mime = content.mimetype || ''
  const fromType = message.mtype && !/^viewOnce/.test(message.mtype) ? message.mtype.replace(/Message/gi, '') : ''
  const stream = await downloadContentFromMessage(content, fromType || mime.split('/')[0])
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

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

async function stickerSetMeta(webpBuffer, meta) {
  return toBuffer(await writeStickerExif(webpBuffer, meta))
}

export { downloadMedia, imageToSticker, videoToSticker, stickerSetMeta }
