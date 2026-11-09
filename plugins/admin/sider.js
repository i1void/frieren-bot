import { activityMap, trackingSince } from '../../lib/activity.js'
import { sleep } from '../../lib/utils.js'

const DAY = 86400000
const SHOW = 60
const ids = (p) => [p.id, p.lid, p.jid, p.phoneNumber].filter((v) => typeof v === 'string' && v.includes('@'))
const tag = (jid) => String(jid).split('@')[0]

export default {
  usage: ['sider'],
  use: '(days) (-y)',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ sock, m, prefix, command, args, groupMetadata, groupAdmins, isBotAdmin, reply }) => {
    if (!groupMetadata) return reply(mess.error)

    const kick = args.includes('-y')
    const days = Number(args.find((a) => /^\d+$/.test(a))) || 7
    const now = Date.now()
    const since = trackingSince(m.chat)
    const trackedDays = since ? (now - since) / DAY : 0
    const activity = activityMap(m.chat)
    const skip = new Set([...groupAdmins, ...[sock.user.id, sock.user.lid].filter(Boolean).map((j) => sock.decodeJid(j))])

    const quiet = []
    for (const p of groupMetadata.participants) {
      const all = ids(p).map((j) => sock.decodeJid(j))
      if (all.some((j) => skip.has(j))) continue
      const last = Math.max(0, ...all.map((j) => activity.get(j) || 0))
      if (!last) quiet.push({ id: p.id, last: 0 })
      else if (now - last > days * DAY) quiet.push({ id: p.id, last })
    }
    quiet.sort((a, b) => a.last - b.last)

    if (!since) {
      return reply('ℹ️ I have not recorded any activity in this group yet. Try again after people have chatted for a while.')
    }
    if (!quiet.length) return reply(`✅ No siders found (inactive for more than ${days} days).`)

    if (kick) {
      if (trackedDays < days) {
        return reply(`❌ I have only been tracking this group for ${trackedDays.toFixed(1)} days, so the list is not reliable yet.\nWait until it reaches ${days} days before removing members.`)
      }
      if (!isBotAdmin) return reply(mess.botAdminNeeded)
      for (const { id } of quiet) {
        await sock.groupParticipantsUpdate(m.chat, [id], 'remove').catch(() => {})
        await sleep(2000)
      }
      return reply(`✅ Done, ${quiet.length} siders removed.`)
    }

    const lines = quiet.slice(0, SHOW).map(({ id, last }) =>
      `◦ @${tag(id)}\n    ${last ? `last active ${Math.floor((now - last) / DAY)} days ago` : `no activity in ${trackedDays.toFixed(1)} days of tracking`}`
    )
    let text = `*SIDER* — ${quiet.length} member(s) inactive for more than ${days} days\n\n${lines.join('\n')}`
    if (quiet.length > SHOW) text += `\n…and ${quiet.length - SHOW} more`
    text += `\n\n*Note*: only accurate when the bot has tracked this group for ${days}+ days (now ${trackedDays.toFixed(1)}). Send *${prefix}${command} ${days} -y* to remove them.`
    await sock.sendMessage(m.chat, { text, mentions: quiet.slice(0, SHOW).map((q) => q.id) }, { quoted: m })
  },
}
