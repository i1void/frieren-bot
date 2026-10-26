// Member actions for group admins: add, kick, promote, demote. The bot must be an admin too.
const ACTIONS = {
  kick: { update: 'remove', ask: 'Tag/reply the user you want to remove.' },
  promote: { update: 'promote', ask: 'Tag/reply the user you want to promote.' },
  demote: { update: 'demote', ask: 'Tag/reply the user you want to demote.' },
}

// What WhatsApp answers when it cannot add someone (the status code of groupParticipantsUpdate).
// 200 is success. Meanings follow the codes documented by whatsapp-web.js (addParticipants).
const ADD_PROBLEMS = {
  403: 'this number can only be invited privately (their privacy settings do not allow being added)',
  404: 'this number is not registered on WhatsApp',
  408: 'this number left the group recently, so they cannot be added right now',
  409: 'this number is already in the group',
  417: 'this number cannot be added to the community, invite them with the group link instead',
  419: 'the group is full',
}

async function addMember({ sock, m, prefix, text, reply }) {
  const example = `Example: ${prefix}add 6281234567890`
  if (!text) return reply(example)
  if (!/^[\d\s+()-]+$/.test(text)) return reply(`"${text}" is not a phone number.\n${example}`)

  let digits = text.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1) // 0812... is read as an Indonesian number
  if (digits.length < 8 || digits.length > 15) return reply(`"${text}" is not a valid phone number.\n${example}`)

  const [found] = await sock.onWhatsApp(`${digits}@s.whatsapp.net`).catch(() => [])
  if (!found?.exists) return reply(`❌ +${digits} is not registered on WhatsApp.`)

  const [result] = await sock.groupParticipantsUpdate(m.chat, [found.jid], 'add')
  const status = String(result?.status ?? '200')
  if (status === '200') return reply(mess.done)

  const why = ADD_PROBLEMS[status] || `WhatsApp refused it (code ${status})`
  let message = `❌ Could not add +${digits}: ${why}.`
  if (['403', '408', '417'].includes(status)) {
    const code = await sock.groupInviteCode(m.chat).catch(() => null)
    if (code) message += `\nSend them this invite link: https://chat.whatsapp.com/${code}`
  }
  reply(message)
}

module.exports = {
  usage: ['add', 'kick', 'promote', 'demote'],
  use: { add: 'nomor', kick: '@tag or reply', promote: '@tag or reply', demote: '@tag or reply' },
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,
  execute: async ({ sock, m, prefix, command, text, mentionedJid, reply }) => {
    if (command === 'add') return addMember({ sock, m, prefix, text, reply })

    const action = ACTIONS[command]
    if (!mentionedJid.length) return reply(action.ask)
    await sock.groupParticipantsUpdate(m.chat, mentionedJid, action.update)
    reply(mess.done)
  },
}
