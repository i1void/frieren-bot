// File upload (tmpfiles.org as fallback) and short links through the i-1v api (config.fileHost, default https://i-1v.web.id).
//   POST {host}/api/upload  multipart/form-data, field "file"
//   POST {host}/api/short   JSON { url }
// Uses Node's built-in fetch / FormData / Blob (Node 22+), so no extra package is needed.
const config = require('../config')

const host = () => (config.fileHost || 'https://i-1v.web.id').replace(/\/+$/, '')
const TIMEOUT = 30000
const URL_KEYS = ['url', 'short_url', 'shortUrl', 'short', 'link', 'file_url', 'download_url', 'result', 'data', 'files']
const isUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim())

// The API answers with JSON. The exact field name is not fixed here: take the first http(s) link in the
// answer, trying common field names first, then anything else. Plain-text answers that are a link work too.
function findUrl(value) {
  if (isUrl(value)) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item)
      if (found) return found
    }
  } else if (value && typeof value === 'object') {
    const keys = [...URL_KEYS.filter((k) => k in value), ...Object.keys(value).filter((k) => !URL_KEYS.includes(k))]
    for (const key of keys) {
      const found = findUrl(value[key])
      if (found) return found
    }
  }
  return null
}

async function readLink(res) {
  const body = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(res.url).host}: ${body.slice(0, 200)}`)
  let parsed = body
  try {
    parsed = JSON.parse(body)
  } catch {}
  const link = findUrl(parsed)
  if (!link) throw new Error(`No link in answer from ${new URL(res.url).host}: ${body.slice(0, 200)}`)
  return link
}

// Fallback host, used only when the main one fails. Files there are removed after about an hour.
async function uploadTmpfiles(form) {
  const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT) })
  const link = await readLink(res)
  // tmpfiles answers with a page link; /dl/ serves the file itself.
  return link.replace(/^http:\/\//i, 'https://').replace(/(tmpfiles\.org)\/(?!dl\/)/, '$1/dl/')
}

// Uploads a Buffer and returns the file link. Tries the main host first, then tmpfiles.org.
async function upload(buffer, { filename = 'file.bin', mime = 'application/octet-stream' } = {}) {
  try {
    const { fromBuffer } = require('file-type')
    const type = await fromBuffer(buffer)
    if (type) {
      mime = type.mime
      if (filename === 'file.bin') filename = `file.${type.ext}`
    }
  } catch {} // file-type is optional here: without it the file goes up as generic binary
  const makeForm = () => {
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mime }), filename)
    return form
  }
  try {
    return await readLink(await fetch(`${host()}/api/upload`, { method: 'POST', body: makeForm(), signal: AbortSignal.timeout(TIMEOUT) }))
  } catch (err) {
    console.error('[upload] main host failed, trying tmpfiles.org:', err.message)
    return uploadTmpfiles(makeForm())
  }
}

// Shortens a link and returns the short link.
async function shorten(url) {
  return readLink(
    await fetch(`${host()}/api/short`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
  )
}

// require('./uploadFile') is the upload function itself; .shorten and .findUrl hang off it.
module.exports = upload
module.exports.shorten = shorten
module.exports.findUrl = findUrl
