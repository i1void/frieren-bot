import { isViewOnceEnabled, revealMedia } from '../../lib/viewonce.js'

const WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']

// Re-sends incoming view-once media as a normal message.
// Private chats: always on. Groups: only when an admin turned it on with the viewonce command.
export default {
  name: 'read-viewonce',
  event: true,
  execute: async ({ sock, m }) => {
    if (m.fromMe || !m.msg) return false
    if (!WRAPPERS.includes(m.mtype) && m.msg.viewOnce !== true) return false
    if (m.isGroup && !isViewOnceEnabled(m.chat)) return false

    await revealMedia(sock, m.chat, m.msg, m).catch((err) => console.error('[event:read-viewonce]', err))
    return false
  },
}
