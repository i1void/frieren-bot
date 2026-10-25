// Builds the SVG for a "quote" sticker (.qc). Pure string work, so it can be tested without WhatsApp or sharp.
const SIZE = 512
const FONT = 'DejaVu Sans, Noto Sans, Arial, sans-serif'
const FONT_SIZE = 26
const NAME_SIZE = 24
const LINE_HEIGHT = 34
const PAD = 22
const AVATAR = 72
const GAP = 14
const MAX_BUBBLE = SIZE - AVATAR - GAP - 20
const CHAR_W = FONT_SIZE * 0.58 // rough average glyph width; the bubble is sized from it

const NAME_COLORS = ['#ff7a8a', '#ffb454', '#7bd88f', '#5ec8ff', '#b79cff', '#ff8fd8', '#4fe0c3']

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])

// A stable colour per sender id.
function nameColor(seed = '') {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return NAME_COLORS[h % NAME_COLORS.length]
}

// Word wrap by estimated width. Words longer than a line are cut.
function wrap(text, maxChars) {
  const lines = []
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = ''
    for (let word of paragraph.split(/\s+/).filter(Boolean)) {
      while ([...word].length > maxChars) {
        const chars = [...word]
        if (line) {
          lines.push(line)
          line = ''
        }
        lines.push(chars.slice(0, maxChars).join(''))
        word = chars.slice(maxChars).join('')
      }
      if (!line) line = word
      else if ([...line].length + 1 + [...word].length <= maxChars) line += ' ' + word
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines.length ? lines : ['']
}

// avatarDataUri: optional "data:image/png;base64,..." (already square). Without it a coloured initial is drawn.
function buildQuoteSvg({ name = 'Unknown', text = '', seed = name, avatarDataUri = null, dark = true }) {
  const maxChars = Math.floor((MAX_BUBBLE - PAD * 2) / CHAR_W)
  const lines = wrap(text, maxChars).slice(0, 14)
  const widest = Math.max(...lines.map((l) => [...l].length), [...name].length * (NAME_SIZE / FONT_SIZE))
  const bubbleW = Math.min(MAX_BUBBLE, Math.max(140, Math.ceil(widest * CHAR_W) + PAD * 2))
  const bubbleH = PAD + NAME_SIZE + 8 + lines.length * LINE_HEIGHT + PAD - 8
  const height = Math.max(bubbleH, AVATAR) + 20
  const x = 10 + AVATAR + GAP
  const y = 10
  const color = nameColor(seed)
  const bg = dark ? '#1f2c34' : '#ffffff'
  const fg = dark ? '#e9edef' : '#111b21'
  const initial = escapeXml([...String(name).trim()][0]?.toUpperCase() || '?')

  const avatar = avatarDataUri
    ? `<clipPath id="c"><circle cx="${10 + AVATAR / 2}" cy="${y + AVATAR / 2}" r="${AVATAR / 2}"/></clipPath>
       <image x="10" y="${y}" width="${AVATAR}" height="${AVATAR}" href="${avatarDataUri}" clip-path="url(#c)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${10 + AVATAR / 2}" cy="${y + AVATAR / 2}" r="${AVATAR / 2}" fill="${color}"/>
       <text x="${10 + AVATAR / 2}" y="${y + AVATAR / 2 + 14}" font-family="${FONT}" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text>`

  const body = lines
    .map((l, i) => `<text x="${x + PAD}" y="${y + PAD + NAME_SIZE + 8 + (i + 1) * LINE_HEIGHT - 8}" font-family="${FONT}" font-size="${FONT_SIZE}" fill="${fg}">${escapeXml(l)}</text>`)
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${height}" viewBox="0 0 ${SIZE} ${height}">
  ${avatar}
  <rect x="${x}" y="${y}" width="${bubbleW}" height="${bubbleH}" rx="22" fill="${bg}"/>
  <path d="M${x + 2} ${y + 14} L${x - 12} ${y + 2} L${x + 6} ${y} Z" fill="${bg}"/>
  <text x="${x + PAD}" y="${y + PAD + NAME_SIZE - 4}" font-family="${FONT}" font-size="${NAME_SIZE}" font-weight="700" fill="${color}">${escapeXml([...String(name)].length > 18 ? [...String(name)].slice(0, 17).join('') + '…' : name)}</text>
  ${body}
</svg>`
  return { svg, width: SIZE, height }
}

module.exports = { buildQuoteSvg, wrap, escapeXml }
