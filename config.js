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
  packName: 'Frieren', //pack+author for sticker 
  authorName: 'Void',
  prefixes: ['#', '.', '!', '/'],
  isPublic: true,
  cooldown: 3, // seconds between commands per user (owner is exempt), 0 = off
  apiBase: 'https://api.i1void.is-a.dev', // API used by the downloader plugins
  limit: {
    free: 15,
    premium: 10000,
  },
  timezone: 'Asia/Jakarta',
  messages: global.mess,
}
