// Small HTTP helpers with a timeout, so a slow API can never hang a command forever.
// A non-2xx answer throws, so callers handle every failure in one catch block.
const fetch = require('node-fetch')

const DEFAULT_TIMEOUT = 20000

async function request(url, { timeout = DEFAULT_TIMEOUT, ...options } = {}) {
  const res = await fetch(url, { timeout, ...options })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`)
  return res
}

const fetchJson = async (url, options) => (await request(url, options)).json()
const fetchText = async (url, options) => (await request(url, options)).text()
const fetchBuffer = async (url, options) => (await request(url, options)).buffer()

module.exports = { fetchJson, fetchText, fetchBuffer }
