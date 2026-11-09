import { recordActivity } from '../../lib/activity.js'

// Remembers when each member last sent a message (used by sider). Never blocks other events.
export default {
  name: 'member-activity',
  event: true,
  groupOnly: true,
  execute: async ({ m }) => {
    if (!m.fromMe && m.sender) recordActivity(m.chat, m.sender)
    return false
  },
}
