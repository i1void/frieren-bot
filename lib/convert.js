import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import ff from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
const ffmpegPath = ffmpegInstaller.path
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
  try {
    fs.writeFileSync(input, buffer)
    await runFfmpeg(input, output, ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k'])
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

async function convertToMp3Tagged(buffer, { cover, title, artist, album } = {}) {
  const input = tmpFile('in')
  const coverPath = cover ? tmpFile('jpg') : null
  const output = tmpFile('mp3')

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
    fs.writeFileSync(input, buffer)
    if (coverPath) fs.writeFileSync(coverPath, cover)
    await new Promise((resolve, reject) => {
      // execFile, not fluent-ffmpeg: it splits arguments on spaces and breaks titles
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
  try {
    fs.writeFileSync(input, buffer)
    await runFfmpeg(input, output, ['-vn', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1'])
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

const isAnimatedWebp = (buffer) => buffer.subarray(0, 64).includes('ANIM')

async function convertWebpToPng(buffer) {
  const input = tmpFile('webp')
  const output = tmpFile('png')
  try {
    fs.writeFileSync(input, buffer)
    await runFfmpeg(input, output, ['-frames:v', '1'])
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

async function remuxToMp4(buffer) {
  const input = tmpFile('in')
  const output = tmpFile('mp4')
  try {
    fs.writeFileSync(input, buffer)
    await new Promise((resolve, reject) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', '-brand', 'mp42', '-f', 'mp4', output],
        { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
        (err, _out, stderr) => {
          if (err) reject(new Error(`ffmpeg failed: ${String(stderr || err.message).trim().split('\n').slice(-3).join(' | ')}`))
          else resolve()
        }
      )
    })
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

// Runs an ffmpeg audio filter. voice = true gives an ogg/opus voice note, otherwise an mp3.
// The input is first resampled to 44.1 kHz so asetrate-based effects sound the same for any source.
async function applyAudioFilter(buffer, filter, { voice = false } = {}) {
  const input = tmpFile('in')
  const output = tmpFile(voice ? 'ogg' : 'mp3')
  const codec = voice
    ? ['-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1']
    : ['-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '2']
  try {
    fs.writeFileSync(input, buffer)
    await new Promise((resolve, reject) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', input, '-vn', '-af', `aresample=44100,${filter},aresample=44100`, ...codec, output],
        { maxBuffer: 10 * 1024 * 1024, timeout: 60000 },
        (err, _out, stderr) => {
          if (err) reject(new Error(`ffmpeg failed: ${String(stderr || err.message).trim().split('\n').slice(-3).join(' | ')}`))
          else resolve()
        }
      )
    })
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

export { remuxToMp4, convertToMp3, convertToMp3Tagged, convertToOpus, convertWebpToPng, isAnimatedWebp, applyAudioFilter }
