const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')
const ff = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
ff.setFfmpegPath(ffmpegPath)

function tmpFile(ext) {
  return path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.${ext}`)
}

function runFfmpeg(inputPath, outputPath, args) {
  return new Promise((resolve, reject) => {
    ff(inputPath)
      .addOutputOptions(args)
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath)
  })
}

async function convertToMp3(buffer) {
  const input = tmpFile('in')
  const output = tmpFile('mp3')
  fs.writeFileSync(input, buffer)
  await runFfmpeg(input, output, ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k'])
  const result = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return result
}

// MP3 with ID3 tags + embedded cover art. `cover` is an optional image Buffer (jpg/png).
// Uses execFile directly (not fluent-ffmpeg) because fluent-ffmpeg splits arguments on spaces,
// which breaks titles like "Circa 40 - Outro".
async function convertToMp3Tagged(buffer, { cover, title, artist, album } = {}) {
  const input = tmpFile('in')
  const coverPath = cover ? tmpFile('jpg') : null
  const output = tmpFile('mp3')
  fs.writeFileSync(input, buffer)
  if (coverPath) fs.writeFileSync(coverPath, cover)

  const args = ['-y', '-i', input]
  if (coverPath) args.push('-i', coverPath)
  args.push('-map', '0:a', '-c:a', 'libmp3lame', '-b:a', '320k', '-ar', '44100', '-ac', '2')
  if (coverPath) {
    args.push('-map', '1:v', '-c:v', 'mjpeg', '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)')
  }
  args.push('-id3v2_version', '3', '-write_id3v1', '1')
  if (title) args.push('-metadata', `title=${title}`)
  if (artist) args.push('-metadata', `artist=${artist}`)
  if (album) args.push('-metadata', `album=${album}`)
  args.push(output)

  try {
    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, _out, stderr) => {
        if (err) reject(new Error(`ffmpeg failed: ${String(stderr || err.message).trim().split('\n').slice(-3).join(' | ')}`))
        else resolve()
      })
    })
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
    if (coverPath) fs.rmSync(coverPath, { force: true })
  }
}

async function convertToOpus(buffer) {
  const input = tmpFile('in')
  const output = tmpFile('ogg')
  fs.writeFileSync(input, buffer)
  await runFfmpeg(input, output, ['-vn', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1'])
  const result = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return result
}

// Animated WebP files carry an "ANIM" chunk right after the header.
const isAnimatedWebp = (buffer) => buffer.subarray(0, 64).includes('ANIM')

async function convertWebpToPng(buffer) {
  const input = tmpFile('webp')
  const output = tmpFile('png')
  fs.writeFileSync(input, buffer)
  try {
    await runFfmpeg(input, output, ['-frames:v', '1'])
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

module.exports = { convertToMp3, convertToMp3Tagged, convertToOpus, convertWebpToPng, isAnimatedWebp }
