// Per-user command cooldown, kept in memory.
// check(id) returns { ok: true } and starts the timer, or { ok: false, wait, notify }
// while the user is cooling down. `notify` is true only once per window, so the bot
// answers the first rush once instead of replying to every spammed command.
function createCooldown(seconds, now = Date.now) {
  const entries = new Map() // id -> { until, warned }

  return {
    check(id) {
      if (!(seconds > 0)) return { ok: true }
      const t = now()

      if (entries.size > 500) {
        for (const [key, entry] of entries) if (entry.until <= t) entries.delete(key)
      }

      const entry = entries.get(id)
      if (entry && entry.until > t) {
        const notify = !entry.warned
        entry.warned = true
        return { ok: false, wait: Math.ceil((entry.until - t) / 1000), notify }
      }

      entries.set(id, { until: t + seconds * 1000, warned: false })
      return { ok: true }
    },
  }
}

module.exports = { createCooldown }
