const { quoteBlock, digits, createSession, sentToday, addRoute, isOptedOut, optOut, optIn } = require('../../lib/menfess')

const MAX_LENGTH = 1000
const MAX_PER_TARGET_PER_DAY = 3

// ".menfess 628123456789 | message"            -> sender shown as "Someone"
// ".menfess 628123456789 | Alias | message"    -> sender shown as "Alias"
// ".menfess 628123456789 message"              -> same as the first form
function parse(text) {
  const parts = text.split('|').map((p) => p.trim())
  if (parts.length >= 3) return { number: parts[0], alias: parts[1], message: parts.slice(2).join(' | ') }
  if (parts.length === 2) return { number: parts[0], alias: '', message: parts[1] }
  const [number, ...rest] = text.trim().split(/\s+/)
  return { number, alias: '', message: rest.join(' ') }
}

// Digits only. "00" (international dialing prefix) is dropped. A single leading 0 is a local number:
// it becomes config.countryCode (optional, e.g. '62') when set; otherwise null (the user must add the country code).
function normalizeNumber(raw, config) {
  let number = String(raw || '').replace(/\D/g, '')
  if (number.startsWith('00')) return number.replace(/^0+/, '')
  if (number.startsWith('0')) return config.countryCode ? config.countryCode + number.slice(1) : null
  return number
}

module.exports = {
  usage: ['menfess'],
  hidden: ['confess'],
  use: 'number | message',
  category: 'menfess',
  limit: true,
  execute: async ({ sock, m, config, prefix, command, text, reply, useLimit, refundLimit }) => {
    if (m.isGroup) return reply(mess.privateOnly)

    const help =
      `*MENFESS* — send an anonymous message through the bot\n\n` +
      `${prefix}${command} 628123456789 | your message\n` +
      `${prefix}${command} 628123456789 | Alias | your message\n\n` +
      `The receiver can reply to your message and you get the reply here. Neither side sees the other's number.\n\n` +
      `Do not want to receive menfess?\n${prefix}${command} off  (turn back on: ${prefix}${command} on)`

    if (!text) return reply(help)

    // The receiver's own switch.
    const sub = text.trim().toLowerCase()
    if (sub === 'off') {
      optOut(m.sender)
      return reply('✅ Done. Nobody can send you a menfess anymore.')
    }
    if (sub === 'on') {
      optIn(m.sender)
      return reply('✅ Menfess is on again.')
    }

    const { number, alias: rawAlias, message } = parse(text)
    const target = normalizeNumber(number, config)
    if (target === null) return reply(`Start the number with the country code, without 0 or +.\nExample: 628123456789 (Indonesia), 14155552671 (US), 447911123456 (UK).`)
    if (target.length < 8 || target.length > 15) return reply(`Invalid number. Use the full number with country code.\n\n${help}`)
    if (!message) return reply(`Write a message too.\n\n${help}`)
    if (message.length > MAX_LENGTH) return reply(`Message is too long (max ${MAX_LENGTH} characters).`)

    // Alias: one short plain line, no mentions or formatting characters.
    const alias = rawAlias.replace(/[@*_~`\n\r]/g, '').trim().slice(0, 20) || 'Someone'

    if ([digits(m.sender), digits(sock.user.id)].includes(target)) return reply('You cannot send a menfess to yourself or to the bot.')
    if (isOptedOut(target)) return reply('That number does not accept menfess.')

    const [found] = (await sock.onWhatsApp(target).catch(() => [])) || []
    if (!found?.exists) return reply('That number is not on WhatsApp.')
    if (sentToday(m.sender, found.jid) >= MAX_PER_TARGET_PER_DAY) {
      return reply(`You already sent ${MAX_PER_TARGET_PER_DAY} menfess to that number today. Try again tomorrow.`)
    }

    if (!useLimit()) return

    try {
      const code = createSession(m.sender, found.jid, alias)
      const sent = await sock.sendMessage(found.jid, {
        text:
          `💌 *MENFESS* #${code}\nFrom: *${alias}*\n\n${quoteBlock(message)}\n\n` +
          `_Send a message to answer, or reply to this one._\n` +
          `_Stop receiving: ${prefix}menfess off_`,
      })
      // A reply to that message goes back to the sender's chat.
      addRoute(sent?.key?.id, code, m.chat, true, found.jid)
      await reply(`✅ Menfess #${code} sent. When they reply, it shows up here.`)
    } catch (err) {
      console.error('[menfess]', err)
      refundLimit()
      await reply(mess.error).catch(console.error)
    }
  },
}
