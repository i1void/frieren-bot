const DEFAULT_TIMEOUT = 20000

async function request(url, { timeout = DEFAULT_TIMEOUT, ...options } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout), ...options })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.error || body.msg || ''
    } catch {}
    throw new Error(`HTTP ${res.status} from ${new URL(url).host}${detail ? `: ${detail}` : ''}`)
  }
  return res
}

const fetchJson = async (url, options) => (await request(url, options)).json()
const fetchText = async (url, options) => (await request(url, options)).text()
const fetchBuffer = async (url, options) => Buffer.from(await (await request(url, options)).arrayBuffer())

export { fetchJson, fetchText, fetchBuffer }
