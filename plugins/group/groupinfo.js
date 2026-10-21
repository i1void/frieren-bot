const moment = require('moment-timezone')

module.exports = {
  name: 'groupinfo',
  aliases: [],
  category: 'group',
  description: 'Show group info',
  groupOnly: true,
  execute: async ({ m, groupMetadata, reply }) => {
    if (!groupMetadata) return reply('Failed to fetch group info, please try again.')
    reply(
      `*${groupMetadata.subject}*\nID: ${m.chat}\nMembers: ${groupMetadata.participants.length}\nCreated: ${moment(
        groupMetadata.creation * 1000
      ).format('DD/MM/YYYY')}`
    )
  },
}
