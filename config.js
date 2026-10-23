global.mess = {
  wait: '[ Loading ] Please Wait',
  done: '[ Loaded Success ]',
  error: '[ System Failed ] Error, please contact the owner',
  groupOnly: '[ System Notice ] Use this in group chat!',
  privateOnly: '[ System Notice ] Use this in private chat!',
  adminOnly: '[ System Notice ] for admin! not npc',
  botAdminNeeded: '[ System Notice ] please add bot admin',
  ownerOnly: '[ System Access Failed ] Access Denied',
  limitHabis: 'Your limit is used up',
  banned: '[ System Access Failed ] you are banned by the owner',
  cooldown: '[ System Notice ] Slow down, wait a moment',
  spamWarning: '[ System Notice ] Stop spamming commands, or you will be blocked for a while',
  spamBlocked: '[ System Notice ] You are blocked for spamming commands, try again later',
}

module.exports = {
  sessionName: 'frieren',
  usePairingCode: true,
  // Full number with country code, digits only, no + or spaces.
  // e.g. 14155552671 (US), 447911123456 (UK), 6281234567890 (Indonesia)
  botNumber: 'XXXXXXXXXXX',
  owner: ['XXXXXXXXXXX'],
  ownerName: 'Owner',
  botName: 'Frieren Bot',
  packName: 'Frieren', // sticker pack name
  authorName: 'Void', // sticker author name
  prefixes: ['#', '.', '!', '/'],
  isPublic: true,
  // Anti-spam for commands (the owner is exempt). A command sent within `cooldown` seconds of the previous
  // one is ignored; keep doing it and the user is warned (warnAt), then blocked for blockMinutes (blockAt).
  antiSpam: { cooldown: 3, warnAt: 3, blockAt: 5, blockMinutes: 10 },
  apiBase: 'https://api.i1void.is-a.dev', // API used by the downloader plugins
  limit: {
    free: 15,
    premium: 10000,
  },
  timezone: 'Asia/Jakarta',
  // Optional: a number starting with 0 (e.g. 0812...) gets this country code (62812...). Remove the line to require full international numbers.
  countryCode: '62',
  messages: global.mess,
}
