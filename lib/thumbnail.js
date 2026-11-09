import fs from 'node:fs'
import path from 'node:path'
import { fetchBuffer } from './http.js'
import { getSetting, setSetting, clearSetting } from './settings.js'

// Menu thumbnail. It goes out as a link-preview image, so WhatsApp does not save it to anyone's gallery.
// Source (set with the setcover command, stored in the database):
//   (nothing)  -> config.thumbnail link if set, otherwise the file below
//   "file"     -> the file below only
//   <link>     -> that link (falls back to the file if it cannot be fetched)
//   "off"      -> no thumbnail, plain text menu
const THUMB_FILE = path.join(import.meta.dirname, '../storage/media/image/thumb.jpg')
const THUMB_TTL = 60 * 60 * 1000
let thumbCache = { link: '', at: 0, buffer: null }

async function getThumbnail(config) {
  const setting = getSetting('thumbnail')
  if (setting === 'off') return null

  const link = setting === 'file' ? '' : (setting || String(config.thumbnail || '')).trim()
  if (/^https?:\/\//i.test(link)) {
    if (thumbCache.link === link && Date.now() - thumbCache.at < THUMB_TTL) return thumbCache.buffer
    try {
      const buffer = await fetchBuffer(link, { timeout: 10000 })
      thumbCache = { link, at: Date.now(), buffer }
      return buffer
    } catch (err) {
      console.error('[menu] thumbnail link failed:', err.message)
      if (thumbCache.link === link) return thumbCache.buffer // an old copy beats none
    }
  }
  return fs.existsSync(THUMB_FILE) ? fs.readFileSync(THUMB_FILE) : null
}

function saveThumbnailFile(buffer) {
  fs.mkdirSync(path.dirname(THUMB_FILE), { recursive: true })
  fs.writeFileSync(THUMB_FILE, buffer)
  setSetting('thumbnail', 'file')
}

function useThumbnailLink(link) {
  thumbCache = { link: '', at: 0, buffer: null }
  setSetting('thumbnail', link)
}

const disableThumbnail = () => setSetting('thumbnail', 'off')
const resetThumbnail = () => clearSetting('thumbnail')

export { THUMB_FILE, getThumbnail, saveThumbnailFile, useThumbnailLink, disableThumbnail, resetThumbnail }
