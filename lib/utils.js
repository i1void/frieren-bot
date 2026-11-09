import axios from 'axios'
import humanReadable from 'human-readable'

const { sizeFormatter } = humanReadable

export const runtime = (seconds) => {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [d && `${d}d`, (d || h) && `${h}h`, (d || h || m) && `${m}m`, `${s}s`].filter(Boolean).join(' ')
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const participantIds = (p) => [p.id, p.lid, p.jid, p.phoneNumber].filter((v) => typeof v === 'string' && v.includes('@'))

export const getGroupAdmins = (participants, decode = (jid) => jid) =>
  participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin').flatMap(participantIds).map(decode)

export const getBuffer = async (url, options = {}) => {
  const res = await axios({
    method: 'get',
    url,
    headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
    timeout: 30000,
    ...options,
    responseType: 'arraybuffer',
  })
  return res.data
}

export const formatp = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
})
