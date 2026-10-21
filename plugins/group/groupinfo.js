const moment = require('moment-timezone')

module.exports = {
  usage: ['groupinfo'],
  category: 'group',
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
