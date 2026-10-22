module.exports = {
  usage: ['owner'],
  category: 'others',
  execute: async ({ sock, m, config }) => {
    const numbers = config.owner.map((v) => v.replace(/\D/g, '')).filter(Boolean)
    const contacts = numbers.map((number, i) => {
      const name = i === 0 ? config.ownerName : `${config.ownerName} ${i + 1}`
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        `ORG:${config.botName}`,
        `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
        'END:VCARD',
      ].join('\n')
      return { displayName: name, vcard }
    })

    await sock.sendMessage(
      m.chat,
      { contacts: { displayName: config.ownerName, contacts } },
      { quoted: m }
    )
    await sock.sendMessage(
      m.chat,
      {
        text: `Hai Kak @${m.sender.split('@')[0]}, Nih Owner Ku.. Kalo Ada Sesuatu Bilang Aja Sama Dia :3.`,
        mentions: [m.sender],
      },
      { quoted: m }
    )
  },
}
