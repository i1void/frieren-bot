import { sleep } from '../../lib/utils.js'

const SHOW = 60
const phoneOf = (p) => [p.phoneNumber, p.jid, p.id].find((v) => typeof v === 'string' && v.endsWith('@s.whatsapp.net'))
const ids = (p) => [p.id, p.lid, p.jid, p.phoneNumber].filter((v) => typeof v === 'string' && v.includes('@'))
const tag = (jid) => String(jid).split('@')[0]

export default {
  usage: ['outsider'],
  use: '(-y)',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ sock, m, prefix, command, args, config, groupMetadata, groupAdmins, isBotAdmin, reply }) => {
    if (!groupMetadata) return reply(mess.error)

    const country = String(config.countryCode || '62')
    const skip = new Set([...groupAdmins, ...[sock.user.id, sock.user.lid].filter(Boolean).map((j) => sock.decodeJid(j))])

    // only members whose phone number is known can be judged (LID-only members are left alone)
    const outsiders = groupMetadata.participants.filter((p) => {
      if (ids(p).some((j) => skip.has(sock.decodeJid(j)))) return false
      const phone = phoneOf(p)
      return phone && !phone.startsWith(country)
    })

    if (!outsiders.length) return reply('✅ This group is clean from outsiders.')

    if (args[0] === '-y') {
      if (!isBotAdmin) return reply(mess.botAdminNeeded)
      for (const p of outsiders) {
        await sock.groupParticipantsUpdate(m.chat, [p.id], 'remove').catch(() => {})
        await sleep(2000)
      }
      return reply(`✅ Done, ${outsiders.length} outsiders removed.`)
    }

    const shown = outsiders.slice(0, SHOW)
    let text = `*OUTSIDER* — ${outsiders.length} member(s) without a +${country} number\n\n${shown.map((p) => `◦ @${tag(p.id)}`).join('\n')}`
    if (outsiders.length > SHOW) text += `\n…and ${outsiders.length - SHOW} more`
    text += `\n\nSend *${prefix}${command} -y* to remove them.`
    await sock.sendMessage(m.chat, { text, mentions: shown.map((p) => p.id) }, { quoted: m })
  },
}
