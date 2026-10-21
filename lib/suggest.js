// "Did you mean ...?" helper: fuzzy match a mistyped command against known names.

// Optimal string alignment distance (Levenshtein + swapping two neighbouring letters).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

const similarity = (a, b) => Math.round((1 - distance(a, b) / Math.max(a.length, b.length)) * 100)

// Returns [{ name, accuracy }], best first. Only plain letters/digits with at
// least 3 characters are checked, so normal chat that happens to start with a
// prefix character ("...", ".5", "/etc/passwd") never triggers a hint.
function suggestCommands(input, names, { minAccuracy = 70, limit = 3 } = {}) {
  if (!/^[a-z0-9]{3,}$/.test(input)) return []
  return names
    .map((name) => ({ name, accuracy: similarity(input, name) }))
    .filter((r) => r.accuracy >= minAccuracy && r.name !== input)
    .sort((a, b) => b.accuracy - a.accuracy || a.name.localeCompare(b.name))
    .slice(0, limit)
}

module.exports = { distance, similarity, suggestCommands }
