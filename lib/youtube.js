// YouTube downloads through the project's own API: GET {apiBase}/downloader/youtube?url=...
// The API only returns stream links. Video-only streams are merged with an audio stream by FFmpeg here.
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const fetch = require('node-fetch')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const { fetchJson } = require('./http')

const MAX_MB = 60 // biggest file that is sent
const MAX_HEIGHT = 720 // quality cap for ytmp4
const MAX_CONCURRENT = 2 // downloads running at the same time
const API_TIMEOUT_MS = 45 * 1000
const DOWNLOAD_TIMEOUT_MS = 3 * 60 * 1000
const FFMPEG_TIMEOUT_MS = 3 * 60 * 1000
const MB = 1024 * 1024

// itags of H.264 mp4 video streams. Other mp4 streams can be AV1, which many phones cannot play.
const H264_ITAGS = new Set([133, 134, 135, 136, 137, 160, 264, 266, 298, 299, 304, 305])
const YOUTUBE_URL = /https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}\S*/i

const USER_MESSAGES = {
  BUSY: 'The bot is busy with other downloads, please try again in a moment.',
  NO_RESULT: 'Could not get this video. It may be private, age-restricted, live, or the link is wrong.',
  NO_FORMAT: `No suitable stream for this video (it may be longer than the ${MAX_MB} MB limit allows).`,
  TOO_LARGE: `The file is larger than ${MAX_MB} MB, so it cannot be sent.`,
}

class YoutubeError extends Error {
  // code: BUSY | NO_RESULT | NO_FORMAT | TOO_LARGE | DOWNLOAD_FAILED | CONVERT_FAILED
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

let active = 0

// First YouTube link found in a piece of text, or null.
const findYoutubeUrl = (text) => String(text || '').match(YOUTUBE_URL)?.[0] ?? null

// Short text to send back to the chat for a failed download.
const describeError = (err, config) => USER_MESSAGES[err?.code] ?? config.messages.error

const cleanTitle = (title) =>
  String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'youtube'

async function getInfo(url, config) {
  const json = await fetchJson(`${config.apiBase}/downloader/youtube?url=${encodeURIComponent(url)}`, { timeout: API_TIMEOUT_MS })
  if (!json?.status || !json.result?.formats) throw new YoutubeError('NO_RESULT', 'API returned no result')
  return json.result
}

// ---- Choosing a stream ---------------------------------------------------------------
const heightOf = (f) => parseInt(f.quality, 10) || 0
const fits = (mb) => !Number.isFinite(mb) || mb <= MAX_MB // unknown size: checked while downloading
const byBitrate = (a, b) => (b.bitrate_kbps || 0) - (a.bitrate_kbps || 0)

// Best audio stream that fits. m4a comes first because WhatsApp plays it without converting.
function pickAudio(formats) {
  const audio = (formats.audio || []).filter((a) => a.url && fits(a.size_mb))
  const m4a = audio.filter((a) => a.container === 'm4a').sort(byBitrate)
  return m4a[0] || audio.sort(byBitrate)[0] || null
}

// { video, audio } where audio is null when the stream already has sound, or null when nothing fits.
function pickVideo(formats) {
  const usable = (f) => f.url && f.container === 'mp4' && heightOf(f) <= MAX_HEIGHT
  const byQuality = (a, b) => heightOf(b) - heightOf(a) || (b.fps || 0) - (a.fps || 0)

  const muxed = (formats.muxed || []).filter((f) => usable(f) && fits(f.size_mb)).sort(byQuality)[0]

  let merged = null
  const m4a = (formats.audio || []).filter((a) => a.url && a.container === 'm4a' && fits(a.size_mb)).sort(byBitrate)[0]
  if (m4a) {
    const budget = MAX_MB - (m4a.size_mb || 0)
    const video = (formats.video || [])
      .filter((f) => usable(f) && H264_ITAGS.has(f.itag) && (Number.isFinite(f.size_mb) ? f.size_mb <= budget : true))
      .sort(byQuality)[0]
    if (video) merged = { video, audio: m4a }
  }

  // The merged one wins only when it is a better quality; otherwise the single file saves work.
  if (muxed && (!merged || heightOf(muxed) >= heightOf(merged.video))) return { video: muxed, audio: null }
  return merged
}

// ---- Downloading ---------------------------------------------------------------------
async function downloadFile(url, dest) {
  let res
  try {
    res = await fetch(url, { timeout: DOWNLOAD_TIMEOUT_MS })
  } catch (err) {
    throw new YoutubeError('DOWNLOAD_FAILED', err.message)
  }
  if (!res.ok) throw new YoutubeError('DOWNLOAD_FAILED', `HTTP ${res.status} from ${new URL(url).host}`)
  if (Number(res.headers.get('content-length')) > MAX_MB * MB) throw new YoutubeError('TOO_LARGE')

  await new Promise((resolve, reject) => {
    let size = 0
    const out = fs.createWriteStream(dest)
    res.body.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_MB * MB) res.body.destroy(new YoutubeError('TOO_LARGE'))
    })
    res.body.on('error', (err) => {
      out.destroy()
      reject(err.code === 'TOO_LARGE' ? err : new YoutubeError('DOWNLOAD_FAILED', err.message))
    })
    out.on('error', reject)
    out.on('finish', resolve)
    res.body.pipe(out)
  })
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { timeout: FFMPEG_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new YoutubeError('CONVERT_FAILED', String(stderr).trim().split('\n').pop() || err.message))
      resolve()
    })
  })
}

// kind: 'audio' or 'video'. Resolves to { buffer, mimetype, ext }.
async function download(info, kind) {
  if (active >= MAX_CONCURRENT) throw new YoutubeError('BUSY')
  active++
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frieren-yt-'))
  try {
    let file, mimetype, ext

    if (kind === 'audio') {
      const audio = pickAudio(info.formats)
      if (!audio) throw new YoutubeError('NO_FORMAT')
      file = path.join(dir, `audio.${audio.container}`)
      await downloadFile(audio.url, file)
      if (audio.container === 'm4a') {
        ;[mimetype, ext] = ['audio/mp4', 'm4a']
      } else {
        const mp3 = path.join(dir, 'audio.mp3')
        await ffmpeg(['-i', file, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '128k', mp3])
        ;[file, mimetype, ext] = [mp3, 'audio/mpeg', 'mp3']
      }
    } else {
      const pick = pickVideo(info.formats)
      if (!pick) throw new YoutubeError('NO_FORMAT')
      file = path.join(dir, 'video.mp4')
      await downloadFile(pick.video.url, file)
      if (pick.audio) {
        const audioFile = path.join(dir, 'audio.m4a')
        const merged = path.join(dir, 'merged.mp4')
        await downloadFile(pick.audio.url, audioFile)
        await ffmpeg(['-i', file, '-i', audioFile, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', merged])
        file = merged
      }
      ;[mimetype, ext] = ['video/mp4', 'mp4']
    }

    if (fs.statSync(file).size > MAX_MB * MB) throw new YoutubeError('TOO_LARGE')
    return { buffer: fs.readFileSync(file), mimetype, ext }
  } finally {
    active--
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

module.exports = { findYoutubeUrl, getInfo, download, describeError, cleanTitle, pickAudio, pickVideo, YoutubeError }
