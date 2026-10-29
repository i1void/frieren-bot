const axios = require('axios')
const FormData = require('form-data')
const { fromBuffer } = require('file-type')

// ocr.space. The default key is their public demo key (rate limited): set OCR_API_KEY in .env for your own free key.
module.exports = {
  usage: ['ocr'],
  use: '[lang] image',
  category: 'utilities',
  limit: true,
  execute: async ({ sock, m, prefix, command, args, reply, useLimit, refundLimit }) => {
    const target = m.quoted || m
    if (!/image/.test((target.msg || target).mimetype || '')) {
      return reply(`Send or reply to an image with the caption ${prefix}${command}\nOptional language: ${prefix}${command} eng (eng, ind, jpn, kor, chs, ...)`)
    }
    const lang = /^[a-z]{3}$/i.test(args[0] || '') ? args[0].toLowerCase() : 'eng'
    if (!useLimit()) return
    try {
      await reply(mess.wait)
      const buffer = await sock.downloadMediaMessage(target)
      const { ext, mime } = (await fromBuffer(buffer)) || {}
      const form = new FormData()
      form.append('file', buffer, { filename: `image.${ext || 'jpg'}`, contentType: mime || 'image/jpeg' })
      form.append('language', lang)
      form.append('OCREngine', '2')
      form.append('isOverlayRequired', 'false')
      const { data } = await axios.post('https://api.ocr.space/parse/image', form, {
        headers: { ...form.getHeaders(), apikey: process.env.OCR_API_KEY || 'helloworld' },
        timeout: 60000,
        maxBodyLength: Infinity,
      })
      const out = (data?.ParsedResults || []).map((r) => r.ParsedText || '').join('\n').trim()
      if (data?.IsErroredOnProcessing || !out) {
        refundLimit()
        return reply(data?.ErrorMessage ? `OCR failed: ${[].concat(data.ErrorMessage).join(', ')}` : 'No text found in the image.')
      }
      reply(out)
    } catch (err) {
      console.error(err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
