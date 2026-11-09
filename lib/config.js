import { fetchJson, fetchBuffer } from './http.js'

const API_URL = 'https://api.i1void.is-a.dev'
const apiUrl = (path, params) => {
  const query = { ...params }
  if (process.env.API_KEY) query.apikey = process.env.API_KEY // optional: the API is free, a key only raises the rate limit
  return `${API_URL}${path}?${new URLSearchParams(query)}`
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
