// Anti-spam for commands, kept in memory.
// A command sent before the cooldown is over is ignored and counts as a strike. Strikes start
// over as soon as the user waits out the cooldown. At `warnAt` strikes the user is warned, at
// `blockAt` strikes they are blocked for `blockMinutes`.
// check(id) returns { ok: true }, or { ok: false, wait, notice }: `notice` is the config.messages
// key to reply with, or undefined to stay silent so the bot never joins in on the spam.
function createAntiSpam({ cooldown = 3, warnAt = 3, blockAt = 5, blockMinutes = 10 } = {}, now = Date.now) {
  const users = new Map() // id -> { until, strikes, blockedUntil }
  const secondsLeft = (until, t) => Math.ceil((until - t) / 1000)

  return {
    check(id) {
      if (!(cooldown > 0)) return { ok: true }
      const t = now()

      if (users.size > 500) {
        for (const [key, entry] of users) if (entry.until <= t && entry.blockedUntil <= t) users.delete(key)
      }

      const user = users.get(id) ?? { until: 0, strikes: 0, blockedUntil: 0 }
      users.set(id, user)

      if (user.blockedUntil > t) return { ok: false, wait: secondsLeft(user.blockedUntil, t) }
      if (user.blockedUntil) {
        user.blockedUntil = 0 // the block is over
        user.strikes = 0
      }

      if (user.until <= t) {
        user.until = t + cooldown * 1000
        user.strikes = 0
        return { ok: true }
      }

      user.strikes += 1
      if (user.strikes >= blockAt) {
        user.blockedUntil = t + blockMinutes * 60 * 1000
        return { ok: false, wait: blockMinutes * 60, notice: 'spamBlocked' }
      }
      const notice = user.strikes === 1 ? 'cooldown' : user.strikes === warnAt ? 'spamWarning' : undefined
      return { ok: false, wait: secondsLeft(user.until, t), notice }
    },
  }
}

module.exports = { createAntiSpam }
