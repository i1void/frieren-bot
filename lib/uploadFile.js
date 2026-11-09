import config from '../config.json' with { type: 'json' }
import { fromBuffer } from './fileType.js'

const host = () => (config.fileHost || 'https://i-1v.web.id').replace(/\/+$/, '')
const TIMEOUT = 30000
const URL_KEYS = ['url', 'short_url', 'shortUrl', 'short', 'link', 'file_url', 'download_url', 'result', 'data', 'files']
const isUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim())

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

async function uploadTmpfiles(form) {
  const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT) })
  const link = await readLink(res)
  return link.replace(/^http:\/\//i, 'https://').replace(/(tmpfiles\.org)\/(?!dl\/)/, '$1/dl/')
}

async function uploadCatbox(form) {
  form.append('reqtype', 'fileupload')
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT) })
  return readLink(res)
}

async function uploadUguu(form) {
  const res = await fetch('https://uguu.se/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT) })
  return readLink(res)
}

async function upload(buffer, { filename = 'file.bin', mime = 'application/octet-stream' } = {}) {
  try {
    const type = await fromBuffer(buffer)
    if (type) {
      mime = type.mime
      if (filename === 'file.bin') filename = `file.${type.ext}`
    }
  } catch {} // if the type cannot be detected the file goes up as generic binary
  const makeForm = (field = 'file') => {
    const form = new FormData()
    form.append(field, new Blob([buffer], { type: mime }), filename)
    return form
  }
  const hosts = [
    ['uguu', () => uploadUguu(makeForm('files[]'))],
    ['catbox', () => uploadCatbox(makeForm('fileToUpload'))],
    ['main host', async () => readLink(await fetch(`${host()}/api/upload`, { method: 'POST', body: makeForm(), signal: AbortSignal.timeout(TIMEOUT) }))],
    ['tmpfiles.org', () => uploadTmpfiles(makeForm())],
  ]
  let lastError
  for (const [name, run] of hosts) {
    try {
      return await run()
    } catch (err) {
      lastError = err
      console.error(`[upload] ${name} failed:`, err.message)
    }
  }
  throw lastError
}

async function uploadSingle(buffer, { filename = 'file.bin', mime = 'application/octet-stream' } = {}, field, send) {
  try {
    const type = await fromBuffer(buffer)
    if (type) {
      mime = type.mime
      if (filename === 'file.bin') filename = `file.${type.ext}`
    }
  } catch {}
  const form = new FormData()
  form.append(field, new Blob([buffer], { type: mime }), filename)
  return send(form)
}

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

const catbox = (buffer, opts) => uploadSingle(buffer, opts, 'fileToUpload', uploadCatbox)
const uguu = (buffer, opts) => uploadSingle(buffer, opts, 'files[]', uploadUguu)
Object.assign(upload, { shorten, catbox, uguu, findUrl })

export { shorten, catbox, uguu, findUrl }
export default upload
