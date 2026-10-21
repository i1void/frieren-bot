const axios = require('axios')
const FormData = require('form-data')
const { fromBuffer } = require('file-type')
const uploadTmpfiles = require('../../lib/uploadFile')
const { fetchBuffer } = require('../../lib/http')

// memegen downloads the background itself, so it needs a public link that serves the raw image.
// catbox is tried first; tmpfiles (the bot's default uploader) is the fallback.
async function uploadBackground(buffer) {
  try {
    const { ext, mime } = (await fromBuffer(buffer)) || {}
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, { filename: `meme.${ext || 'jpg'}`, contentType: mime })
    const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 30000,
    })
    if (/^https?:\/\//.test(String(data).trim())) return String(data).trim()
  } catch (err) {
    console.error('catbox upload failed:', err.message)
  }
  return uploadTmpfiles(buffer)
}

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

module.exports = {
  usage: ['smeme'],
  use: 'top | bottom',
  category: 'tools',
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
      await reply(config.messages.wait)
      const source = await sock.downloadMediaMessage(target)
      const background = await uploadBackground(source)
      const url =
        `https://api.memegen.link/images/custom/${encodeLine(top)}/${encodeLine(bottom)}.png` +
        `?background=${encodeURIComponent(background)}`
      console.log('smeme background:', background)
      const meme = await fetchBuffer(url, { timeout: 30000 })
      await sock.sendImageAsSticker(m.chat, meme, m, { packname: config.packName, author: config.authorName })
    } catch (err) {
      console.error(err)
      refundLimit()
      reply(config.messages.error)
    }
  },
}
