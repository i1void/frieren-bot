import { isViewOnceEnabled, setViewOnce } from '../../lib/viewonce.js'

export default {
  usage: ['viewonce'],
  use: 'on/off',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  execute: async ({ m, prefix, command, args, reply }) => {
    const mode = args[0]?.toLowerCase()
    const on = ['on', '1'].includes(mode)
    const off = ['off', '0'].includes(mode)
    if (!on && !off) {
      return reply(`Status: ${isViewOnceEnabled(m.chat) ? 'on' : 'off'}\nExample: ${prefix}${command} on / ${prefix}${command} off`)
    }
    if (isViewOnceEnabled(m.chat) === on) return reply(`✅ Already ${on ? 'on' : 'off'}.`)
    setViewOnce(m.chat, on)
    reply(on ? '✅ View-once messages in this group will now be re-sent as normal media.' : '✅ View-once auto reveal turned off.')
  },
}
