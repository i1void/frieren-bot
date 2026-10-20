// Ban list and premium list (JIDs), shared by the router and owner plugins.
const { db, transaction } = require('./database')

function jidList(table) {
  const all = db.prepare(`SELECT jid FROM ${table} ORDER BY rowid`)
  const has = db.prepare(`SELECT 1 FROM ${table} WHERE jid = ?`)
  const clear = db.prepare(`DELETE FROM ${table}`)
  const add = db.prepare(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`)

  return {
    get: () => all.all().map((row) => row.jid),
    has: (jid) => has.get(jid) !== undefined,
    set: (list) =>
      transaction(() => {
        clear.run()
        for (const jid of list) add.run(jid)
      }),
  }
}

const banned = jidList('banned')
const premium = jidList('premium')

module.exports = {
  getBanned: banned.get,
  setBanned: banned.set,
  isBanned: banned.has,
  getPremium: premium.get,
  setPremium: premium.set,
  hasPremium: premium.has,
}
