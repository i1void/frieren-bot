const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const ff = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const webp = require('node-webpmux')

ff.setFfmpegPath(ffmpegPath)

function tmpFile(ext) {
  return path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.${ext}`)
}

function runFfmpeg(inputPath, outputPath, vf, extraArgs = []) {
  return new Promise((resolve, reject) => {
    ff(inputPath)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions(['-vcodec', 'libwebp', '-vf', vf, ...extraArgs])
      .toFormat('webp')
      .save(outputPath)
  })
}

const STICKER_VF =
  "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"

async function imageToWebp(media) {
  const input = tmpFile('jpg')
  const output = tmpFile('webp')
  fs.writeFileSync(input, media)
  await runFfmpeg(input, output, STICKER_VF)
  const buffer = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return buffer
}

async function videoToWebp(media) {
  const input = tmpFile('mp4')
  const output = tmpFile('webp')
  fs.writeFileSync(input, media)
  await runFfmpeg(input, output, STICKER_VF, [
    '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0',
  ])
  const buffer = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return buffer
}

async function writeStickerExif(webpBuffer, metadata) {
  const input = tmpFile('webp')
  const output = tmpFile('webp')
  fs.writeFileSync(input, webpBuffer)

  if (!metadata.packname && !metadata.author) return input

  const img = new webp.Image()
  const json = {
    'sticker-pack-id': `com.${(metadata.packname || 'tatsu').toLowerCase().replace(/\s+/g, '')}`,
    'sticker-pack-name': metadata.packname,
    'sticker-pack-publisher': metadata.author,
    emojis: metadata.categories || [''],
  }
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)

  await img.load(input)
  fs.unlinkSync(input)
  img.exif = exif
  await img.save(output)
  return output
}

async function writeExifImg(media, metadata) {
  const webpBuffer = await imageToWebp(media)
  return writeStickerExif(webpBuffer, metadata)
}

async function writeExifVid(media, metadata) {
  const webpBuffer = await videoToWebp(media)
  return writeStickerExif(webpBuffer, metadata)
}

module.exports = { imageToWebp, videoToWebp, writeExifImg, writeExifVid }
