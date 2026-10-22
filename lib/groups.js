// Numbered list of the groups the bot is in, shared by .groups and .gc so both use the same numbers.
async function listGroups(sock) {
  const all = Object.values(await sock.groupFetchAllParticipating())
  return all.sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || a.id.localeCompare(b.id))
}

module.exports = { listGroups }
