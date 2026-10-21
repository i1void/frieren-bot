// Plugin template. Files/folders starting with "_" are ignored by the loader.
// To make a new command: copy this file to plugins/<category>/<name>.js
// (without the underscore) and edit it.
module.exports = {
  name: 'example',
  aliases: [],
  category: 'tools', // menu section: downloader | tools | group | owner (or any new name)
  description: 'Short description',
  usage: '<text>', // shown in the menu after the command name
  ownerOnly: false, // only config.owner
  groupOnly: false, // group chat only
  adminOnly: false, // group admin (owner passes); implies groupOnly
  botAdmin: false, // bot must be a group admin (owner does NOT bypass); implies groupOnly
  hidden: false, // true = not listed in the menu
  limit: false, // metadata only: call ctx.useLimit() after validating args, ctx.refundLimit() if the job fails
  execute: async (ctx) => {
    const { reply, text, prefix, command } = ctx
    if (!text) return reply(`Example: ${prefix}${command} hello`)
    reply(text)
  },
}
