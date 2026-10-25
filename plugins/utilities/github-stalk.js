const { fetchJson } = require('../../lib/http')
const { getTimezone } = require('../../lib/db')

const USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function formatDate(iso, timeZone) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function buildCaption(r, timeZone) {
  const field = (label, value) => (value === null || value === undefined || value === '' ? null : `𖦹 ${label} : *${value}*`)
  const joined = r.accountCreated && formatDate(r.accountCreated, timeZone)
  const updated = r.lastUpdated && formatDate(r.lastUpdated, timeZone)

  const languages = (r.topLanguages || []).map((l) => `${l.language} (${l.count})`).join(', ')
  const repos = (r.popularRepositories || []).slice(0, 1).map((repo, i) => {
    const about = repo.description ? ` - ${clip(repo.description, 60)}` : ''
    return `${i + 1}. ${repo.name} ⭐${repo.stars}${about}`
  })

  return [
    '*`「 GITHUB STALK 」`*',
    field('username', r.username),
    field('name', r.name),
    field('bio', r.bio),
    field('location', r.location),
    field('company', r.company),
    field('blog', r.blog),
    field('email', r.email),
    field('twitter', r.twitter),
    field('hireable', r.isHireable === null || r.isHireable === undefined ? null : r.isHireable ? 'yes' : 'no'),
    '',
    field('followers', r.followers),
    field('following', r.following),
    field('repos', r.publicRepos),
    field('gists', r.publicGists),
    field('stars', r.totalStars),
    field('forks', r.totalForks),
    field('joined', joined),
    field('last update', updated),
    languages ? `\n*Top languages*\n${languages}` : null,
    repos.length ? `\n*Popular repository*\n${repos.join('\n')}` : null,
    r.profileUrl ? `\n${r.profileUrl}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

module.exports = {
  usage: ['githubstalk'],
  hidden: ['gitstalk'],
  use: 'username',
  category: 'utilities',
  execute: async ({ sock, m, config, prefix, command, text, reply }) => {
    const username = text.trim().split(/\s+/)[0].replace(/^@/, '')
    if (!username) return reply(`Enter a GitHub username.\nExample: ${prefix}${command} i1void`)
    if (!USERNAME.test(username)) return reply('That is not a valid GitHub username.')

    try {
      await reply(config.messages.wait)
      const json = await fetchJson(`${config.apiBase}/stalk/github?username=${encodeURIComponent(username)}`)
      if (!json?.status || !json.result) return reply(`GitHub user "${username}" was not found.`)

      const caption = buildCaption(json.result, getTimezone(config))
      if (json.result.avatar) {
        try {
          return await sock.sendMessage(m.chat, { image: { url: json.result.avatar }, caption }, { quoted: m })
        } catch (err) {
          console.error('[githubstalk] avatar failed, sending text only:', err.message)
        }
      }
      await reply(caption)
    } catch (err) {
      if (/HTTP 404/.test(err.message)) return reply(`GitHub user "${username}" was not found.`)
      console.error(err)
      reply(config.messages.error)
    }
  },
}
