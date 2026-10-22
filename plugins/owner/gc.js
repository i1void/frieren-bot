const { listGroups } = require('../../lib/groups')
const { isMuted, setMuted } = require('../../lib/mute')
const { getRent, addDays, setForever, resetRent, forgetGroup, formatLeft } = require('../../lib/groupRent')
const { getGroupAdmins } = require('../../lib/myfunc')

// Owner tool to manage another group by its number from .groups.
module.exports = {
  usage: ['gc'],
  use: '<number> <option>',
  category: 'owner',
  ownerOnly: true,
  execute: async ({ sock, prefix, command, args, reply }) => {
    const p = prefix + command
    const help =
      `*G R O U P   C O N T R O L*\n\n` +
      `*1.* ${p} <no>\n- group info\n\n` +
      `*2.* ${p} <no> open\n- everyone can send messages\n\n` +
      `*3.* ${p} <no> close\n- only admins can send messages\n\n` +
      `*4.* ${p} <no> mute\n- the bot stops responding in that group\n\n` +
      `*5.* ${p} <no> unmute\n- the bot responds again\n\n` +
      `*6.* ${p} <no> link\n- get the invite link (the bot must be admin)\n\n` +
      `*7.* ${p} <no> leave\n- the bot leaves the group\n\n` +
      `*8.* ${p} <no> reset\n- clear the stay duration of the bot\n\n` +
      `*9.* ${p} <no> forever\n- the bot stays in the group forever\n\n` +
      `*10.* ${p} <no> 30d\n- the bot stays for 30 days (extends if already set)\n` +
      `Example: ${p} 2 1d\n\n` +
      `Send ${prefix}groups to see the group numbers.`

    const [no, rawOption] = args
    if (!no || !/^\d+$/.test(no)) return reply(help)

    const group = (await listGroups(sock))[Number(no) - 1]
    if (!group) return reply('❌ Group not found.')

    const { id, subject, participants } = group
    const botIds = [sock.user.id, sock.user.lid].filter(Boolean).map((jid) => sock.decodeJid(jid))
    const isBotAdmin = botIds.some((b) => getGroupAdmins(participants, sock.decodeJid).includes(b))
    const needAdmin = (what) => reply(`❌ Can't ${what} ${subject} because the bot is not an admin there.`)
    const option = rawOption?.toLowerCase()

    if (!option) {
      const rent = getRent(id)
      const stay = rent.stay ? 'FOREVER' : rent.expiresAt ? formatLeft(rent.expiresAt - Date.now()) : 'NOT SET'
      return reply(
        `*${subject}*\nMembers: ${participants.length}\nStay: ${stay}\nStatus: ${isMuted(id) ? 'OFF (muted)' : 'ON'}\n` +
          `Bot admin: ${isBotAdmin ? 'yes' : 'no'}\nID: ${id}`
      )
    }

    switch (true) {
      case option === 'open':
      case option === 'close': {
        if (!isBotAdmin) return needAdmin(option)
        await sock.groupSettingUpdate(id, option === 'open' ? 'not_announcement' : 'announcement')
        await sock.sendMessage(id, { text: `✅ Group has been ${option === 'open' ? 'opened' : 'closed'}.` }).catch(() => {})
        return reply(`✅ ${subject} ${option === 'open' ? 'opened' : 'closed'}.`)
      }
      case option === 'mute':
        setMuted(id, true)
        return reply(`✅ Bot muted in ${subject}.`)
      case option === 'unmute':
        setMuted(id, false)
        return reply(`✅ Bot unmuted in ${subject}.`)
      case option === 'link': {
        if (!isBotAdmin) return needAdmin('get the link of')
        return reply(`https://chat.whatsapp.com/${await sock.groupInviteCode(id)}`)
      }
      case option === 'leave': {
        await sock.sendMessage(id, { text: '❌ Good bye!' }).catch(() => {})
        await sock.groupLeave(id)
        forgetGroup(id)
        return reply(`✅ Left ${subject}.`)
      }
      case option === 'reset':
        resetRent(id)
        return reply(`✅ Stay duration of ${subject} reset.`)
      case option === 'forever':
        setForever(id)
        return reply(`✅ Bot will stay in ${subject} forever.`)
      case /^\d+d$/.test(option): {
        const days = parseInt(option, 10)
        if (!days) return reply(help)
        addDays(id, days)
        return reply(`✅ Bot will stay in ${subject} for ${formatLeft(getRent(id).expiresAt - Date.now())}.`)
      }
      default:
        return reply(help)
    }
  },
}
