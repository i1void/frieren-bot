// Plugin template. Files/folders starting with "_" are ignored by the loader.
// To make a new command: copy this file to plugins/<folder>/<name>.js (folders: admin, ai, convert, download, group, menfess, others, owner, userinfo, utilities)
// (without the underscore) and edit it.
module.exports = {
  usage: ['example'], // command names listed in the menu (the first one is the main name)
  hidden: [], // command names that work but are not listed in the menu
  use: 'text', // argument hint shown in the menu after each name (or { example: 'text', other: 'link' } to give each command its own)
  category: 'utilities', // menu section: admin | ai | converter | downloader | group | utilities | others | user | owner (or any new name)
  ownerOnly: false, // only config.owner
  groupOnly: false, // group chat only
  adminOnly: false, // group admin (owner passes); implies groupOnly
  botAdmin: false, // bot must be a group admin (owner does NOT bypass); implies groupOnly
  limit: false, // metadata only: call ctx.useLimit() after validating args, ctx.refundLimit() if the job fails
  execute: async (ctx) => {
    const { reply, text, prefix, command } = ctx
    if (!text) return reply(`Example: ${prefix}${command} hello`)
    reply(text)
  },
}
