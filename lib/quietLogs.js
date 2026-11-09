const NOISE = {
  info: ['Closing session:', 'Opening session:', 'Removing old closed session:'],
  warn: ['Closing stale open session', 'Closing open session', 'Decrypted message with closed session'],
  error: ['Bad MAC', 'Session error:', 'Failed to decrypt message with any known session'],
}

for (const [level, patterns] of Object.entries(NOISE)) {
  const original = console[level].bind(console)
  console[level] = (...args) => {
    const first = args[0]
    const text = typeof first === 'string' ? first : String(first?.message ?? '')
    if (patterns.some((p) => text.includes(p))) return
    original(...args)
  }
}
