// YouTube download through yt-dlp (https://github.com/yt-dlp/yt-dlp).
// yt-dlp is not an npm package: install it on the server (see "YouTube downloads" in the README).
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const config = require('../config')

const settings = {
  ytdlpPath: 'yt-dlp',
  maxMinutes: 30,
  maxSizeMb: 60,
  maxVideoHeight: 720,
  maxConcurrent: 2,
  ...config.youtube,
}

const TIMEOUT_MS = 5 * 60 * 1000
const YOUTUBE_URL = /https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}\S*/i

const USER_MESSAGES = {
  BUSY: 'The bot is busy with other downloads, please try again in a moment.',
  NO_FILE: `Could not download this video. It may be private, live, or longer than ${settings.maxMinutes} minutes.`,
  TOO_LARGE: `The file is larger than ${settings.maxSizeMb} MB, so it cannot be sent.`,
}

class YtdlpError extends Error {
  // code: BUSY | NOT_INSTALLED | FAILED | NO_FILE | TOO_LARGE
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

let active = 0

// First YouTube link found in a piece of text, or null.
const findYoutubeUrl = (text) => String(text || '').match(YOUTUBE_URL)?.[0] ?? null

// Short text to send back to the chat for a failed download.
const describeError = (err) => USER_MESSAGES[err?.code] ?? config.messages.error

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(settings.ytdlpPath, args, { timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (!err) return resolve(stdout)
      if (err.code === 'ENOENT') {
        return reject(
          new YtdlpError('NOT_INSTALLED', `yt-dlp was not found ("${settings.ytdlpPath}"). Install it or set youtube.ytdlpPath in config.js`)
        )
      }
      const detail = String(stderr).trim().split('\n').pop() || err.message
      reject(new YtdlpError('FAILED', detail))
    })
  })
}

function buildArgs(kind, outDir) {
  const args = [
    '--ignore-config', // never pick up a yt-dlp.conf from the server
    '--no-playlist',
    '--no-warnings',
    '--js-runtimes', `node:${process.execPath}`, // YouTube needs a JavaScript runtime; reuse this Node.js
    '--ffmpeg-location', ffmpegPath,
    '--socket-timeout', '20',
    '--match-filters', `duration<=${settings.maxMinutes * 60}`,
    '--max-filesize', `${settings.maxSizeMb}M`,
    '-o', path.join(outDir, '%(id)s.%(ext)s'),
    '--print', 'after_move:%(title)s',
    '--print', 'after_move:filepath',
  ]
  if (kind === 'audio') {
    args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '128K')
  } else {
    // Up to the configured height, H.264 + AAC inside mp4 so WhatsApp can play it.
    args.push('-S', `res:${settings.maxVideoHeight},vcodec:h264,acodec:aac`, '--merge-output-format', 'mp4')
  }
  return args
}

// The path yt-dlp printed, or else the only finished file in the folder.
function findOutputFile(dir, printedPath) {
  if (printedPath && fs.existsSync(printedPath)) return printedPath
  const name = fs.readdirSync(dir).find((f) => !/\.(part|ytdl|json)$/.test(f))
  return name ? path.join(dir, name) : null
}

const cleanTitle = (title) => title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'youtube'

// kind: 'audio' (mp3) or 'video' (mp4). Resolves to { buffer, title }.
async function download(url, kind) {
  if (active >= settings.maxConcurrent) throw new YtdlpError('BUSY', 'Too many downloads running')
  active++
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frieren-yt-'))
  try {
    const stdout = await run([...buildArgs(kind, dir), '--', url])
    const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean)

    const file = findOutputFile(dir, lines.at(-1))
    if (!file) throw new YtdlpError('NO_FILE', 'yt-dlp finished without producing a file')
    if (fs.statSync(file).size > settings.maxSizeMb * 1024 * 1024) throw new YtdlpError('TOO_LARGE', 'File is over the size limit')

    return { buffer: fs.readFileSync(file), title: cleanTitle(lines.length > 1 ? lines.at(-2) : '') }
  } finally {
    active--
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

module.exports = { findYoutubeUrl, download, describeError, YtdlpError }
