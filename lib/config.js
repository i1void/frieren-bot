// Global settings, loaded once at startup (index.js) after .env: void API client and bot reply messages.
const { fetchJson, fetchBuffer } = require('./http')

// Void API: Api.json('/ai/gemini', { text }) -> GET {API_URL}/ai/gemini?text=...&apikey={API_KEY}
const API_URL = 'https://api.i1void.is-a.dev'
const apiUrl = (path, params) => {
  if (!process.env.API_KEY) throw new Error('API_KEY is not set in .env')
  return `${API_URL}${path}?${new URLSearchParams({ ...params, apikey: process.env.API_KEY })}`
}
global.Api = {
  json: (path, params, options) => fetchJson(apiUrl(path, params), options),
  buffer: (path, params, options) => fetchBuffer(apiUrl(path, params), options),
}

global.mess = {
  wait: '[ Loading ] Please Wait',
  done: '[ Loaded Success ]',
  error: '[ System Failed ] Error, please contact the owner',
  groupOnly: '[ System Notice ] Use this in group chat!',
  privateOnly: '[ System Notice ] Use this in private chat!',
  adminOnly: '[ System Notice ] for admin! not npc',
  botAdminNeeded: '[ System Notice ] please add bot admin',
  ownerOnly: '[ System Access Failed ] Access Denied',
  limitHabis: 'Your limit is used up',
  banned: '[ System Access Failed ] you are banned by the owner',
  cooldown: '[ System Notice ] Slow down, wait a moment',
  spamWarning: '[ System Notice ] Stop spamming commands, or you will be blocked for a while',
  spamBlocked: '[ System Notice ] You are blocked for spamming commands, try again later',
}
