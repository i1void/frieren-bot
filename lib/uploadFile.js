const axios = require('axios')
const FormData = require('form-data')
const { fromBuffer } = require('file-type')

module.exports = async (buffer) => {
  const { ext, mime } = (await fromBuffer(buffer)) || {}
  const form = new FormData()
  form.append('file', buffer, { filename: `tmp.${ext}`, contentType: mime })

  const { data } = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
    headers: form.getHeaders(),
    timeout: 30000,
  })

  const match = /https?:\/\/tmpfiles\.org\/(.*)/.exec(data.data.url)
  return `https://tmpfiles.org/dl/${match[1]}`
}
