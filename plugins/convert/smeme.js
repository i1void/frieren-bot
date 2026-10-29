const axios = require('axios')
const FormData = require('form-data')
const { fromBuffer } = require('file-type')
const uploadHosting = require('../../lib/uploadFile')
const { fetchBuffer } = require('../../lib/http')

// memegen downloads the background itself, so it needs a public link that serves the raw image.
// Some hosts are blocked/unreadable depending on the server, so we try several of them.
async function postFile(url, field, buffer, extra = {}) {
  const { ext, mime } = (await fromBuffer(buffer)) || {}
  const form = new FormData()
  for (const [k, v] of Object.entries(extra)) form.append(k, v)
  form.append(field, buffer, { filename: `meme.${ext || 'jpg'}`, contentType: mime })
  const { data } = await axios.post(url, form, { headers: form.getHeaders(), timeout: 15000 })
  return data
}

const HOSTS = [
  {
    name: 'uguu',
    upload: async (buffer) => (await postFile('https://uguu.se/upload', 'files[]', buffer)).files[0].url,
  },
  {
    name: 'catbox',
    upload: async (buffer) => String(await postFile('https://catbox.moe/user/api.php', 'fileToUpload', buffer, { reqtype: 'fileupload' })).trim(),
  },
  { name: 'hosting', upload: uploadHosting },
]

// memegen.link text rules: space -> _, _ -> __, - -> --, and ~x codes for special characters.
// An empty line must be "_".
const SPECIAL = { '?': '~q', '&': '~a', '%': '~p', '#': '~h', '/': '~s', '\\': '~b', '<': '~l', '>': '~g' }
function encodeLine(line) {
  const out = line
    .trim()
    .replace(/[_\-]/g, (c) => c + c)
    .replace(/ /g, '_')
    .replace(/[?&%#/\\<>]/g, (c) => SPECIAL[c])
    .replace(/"/g, "''")
    .replace(/\n/g, '~n')
  return out || '_'
}

// Upload + render as one step: if memegen can't read a host's link (415), the next host is tried.
async function makeMeme(source, top, bottom) {
  let lastError
  for (const host of HOSTS) {
    try {
      const background = await host.upload(source)
      const url =
        `https://api.memegen.link/images/custom/${encodeLine(top)}/${encodeLine(bottom)}.png` +
        `?background=${encodeURIComponent(background)}`
      return await fetchBuffer(url, { timeout: 30000 })
    } catch (err) {
      console.error(`smeme: ${host.name} failed:`, err.message)
      lastError = err
    }
  }
  throw lastError
}

module.exports = {
  usage: ['smeme'],
  use: 'top | bottom',
  category: 'converter',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    const target = m.quoted && /image/.test(m.quoted.mtype) ? m.quoted : m
    const mime = (target.msg || target).mimetype || ''
    const [top = '', bottom = ''] = text.split('|')
    if (!/image/.test(mime) || !(top.trim() || bottom.trim())) {
      return reply(`Reply/send an image with the caption ${prefix}${command} top | bottom\nExample: ${prefix}${command} when the code | finally works`)
    }
    if (!useLimit()) return
    try {
      sock.sendMessage(m.chat, { react: { text: '🕒', key: m.key } }).catch(() => {})
      const source = await sock.downloadMediaMessage(target)
      const meme = await makeMeme(source, top, bottom)
      await sock.sendImageAsSticker(m.chat, meme, m, { packname: config.packName, author: config.authorName })
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
