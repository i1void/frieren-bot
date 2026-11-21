import dns from 'node:dns/promises'
import net from 'node:net'
import { fromBuffer } from '../../lib/fileType.js'
import { formatp } from '../../lib/utils.js'

const MAX_MB = 100
const MAX_BYTES = MAX_MB * 1024 * 1024
const MAX_REDIRECTS = 5
const TIMEOUT = 120000

// Block private / local addresses so the bot can't be used to reach its own network (SSRF)
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7))
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
}

async function assertPublicUrl(raw) {
  const url = new URL(raw)
  if (!/^https?:$/.test(url.protocol)) throw new Error('bad protocol')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('blocked address')
  return url
}

async function download(link) {
  let current = link
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const url = await assertPublicUrl(current)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FrierenBot)' },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), url).href
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const declared = Number(res.headers.get('content-length')) || 0
    if (declared > MAX_BYTES) throw Object.assign(new Error('too large'), { tooLarge: true, size: declared })

    const chunks = []
    let size = 0
    for await (const chunk of res.body) {
      size += chunk.length
      if (size > MAX_BYTES) throw Object.assign(new Error('too large'), { tooLarge: true, size })
      chunks.push(chunk)
    }
    return { buffer: Buffer.concat(chunks), headers: res.headers, finalUrl: url }
  }
  throw new Error('too many redirects')
}

function pickFileName(headers, url, ext) {
  const cd = headers.get('content-disposition') || ''
  let name =
    /filename\*=UTF-8''([^;]+)/i.exec(cd)?.[1] ||
    /filename="?([^";]+)"?/i.exec(cd)?.[1] ||
    url.pathname.split('/').filter(Boolean).pop() ||
    ''
  try {
    name = decodeURIComponent(name)
  } catch {}
  name = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim()
  if (!name) name = `file_${Date.now()}`
  if (!/\.[a-z0-9]{2,5}$/i.test(name) && ext) name += `.${ext}`
  return name.slice(0, 120)
}

export default {
  usage: ['getfile'],
  hidden: ['getdoc'],
  use: 'link [video]',
  category: 'utilities',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const [link, modeRaw] = (text || '').trim().split(/\s+/)
    const mode = (modeRaw || '').toLowerCase()
    if (!link) {
      return reply(
        `Enter a direct file/image link.\nExample: ${prefix}${command} https://example.com/photo.jpg\n\n` +
          `Modes:\n• ${prefix}${command} <link> → send as document (original quality)\n` +
          `• ${prefix}${command} <link> video → send as normal video/photo (no caption)`
      )
    }
    if (modeRaw && mode !== 'video') return reply(`Unknown mode "${modeRaw}". Use: video`)
    if (!/^https?:\/\/\S+$/i.test(link)) return reply('Invalid link, it must start with http:// or https://')
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const { buffer, headers, finalUrl } = await download(link)
      if (!buffer.length) {
        refundLimit()
        return reply('The file is empty.')
      }
      const detected = await fromBuffer(buffer).catch(() => null)
      const headerMime = (headers.get('content-type') || '').split(';')[0].trim()
      const mimetype = detected?.mime || (headerMime && headerMime !== 'text/html' ? headerMime : 'application/octet-stream')
      const fileName = pickFileName(headers, finalUrl, detected?.ext)
      const isVideo = mimetype.startsWith('video/')
      const isImage = mimetype.startsWith('image/')

      if (mode === 'video' && (isVideo || isImage)) {
        const content = isVideo ? { video: buffer, mimetype } : { image: buffer, mimetype }
        return await sock.sendMessage(m.chat, content, { quoted: m })
      }

      await sock.sendMessage(
        m.chat,
        { document: buffer, mimetype, fileName, caption: `📁 ${fileName}\n📦 ${formatp(buffer.length)}` },
        { quoted: m }
      )
    } catch (err) {
      refundLimit()
      if (err.tooLarge) return reply(`File too large (${formatp(err.size)}, max ${MAX_MB} MB).`)
      if (err.message === 'blocked address') return reply('That link is not allowed.')
      console.error(err)
      await reply(`Failed to download the file: ${err.message}`).catch(console.error)
    }
  },
}
