const { getTimezone } = require('../../lib/db')

const MAX_DESC = 300

// "21 Oct 2026" in the timezone from config.json.
const formatDate = (seconds, config) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: getTimezone(config), day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(seconds * 1000)
  )

module.exports = {
  usage: ['groupinfo'],
  category: 'group',
  groupOnly: true,
  execute: async ({ m, config, groupMetadata, groupAdmins, reply }) => {
    if (!groupMetadata) return reply('Failed to fetch group info, please try again.')

    const desc = (groupMetadata.desc || '').trim()
    const lines = [
      '━──「 *GROUP INFO* 」──━',
      '',
      `*${groupMetadata.subject}*`,
      `𖦹 id : ${m.chat}`,
      `𖦹 member : *${groupMetadata.participants.length}* (${groupAdmins.length} admin)`,
      `𖦹 created : *${formatDate(groupMetadata.creation, config)}*`,
      `𖦹 chat : *${groupMetadata.announce ? 'admins only' : 'everyone'}*`,
    ]
    if (desc) lines.push('', '*Description*', desc.length > MAX_DESC ? `${desc.slice(0, MAX_DESC)}…` : desc)
    reply(lines.join('\n'))
  },
}
