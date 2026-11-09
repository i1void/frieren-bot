import fs from 'node:fs'
import path from 'node:path'
import { db, groupSetters } from './sqlite.js'

const DEFAULT_WELCOME = 'Hi @user, welcome to @group!'
const DEFAULT_LEFT = 'Goodbye @user, leaving @group'

const findGroup = db.prepare('SELECT welcome_text, left_text, welcome_on, left_on FROM group_settings WHERE chat = ?')

const getText = (groupId, column, fallback) => findGroup.get(groupId)?.[column] || fallback
const getFlag = (groupId, column) => (findGroup.get(groupId)?.[column] ?? 1) === 1

const setWelcome = (groupId, message) => groupSetters.welcome_text.run(groupId, message)
const setLeft = (groupId, message) => groupSetters.left_text.run(groupId, message)
const setWelcomeStatus = (groupId, status) => groupSetters.welcome_on.run(groupId, status ? 1 : 0)
const setLeftStatus = (groupId, status) => groupSetters.left_on.run(groupId, status ? 1 : 0)

const getWelcome = (groupId) => getText(groupId, 'welcome_text', DEFAULT_WELCOME)
const getLeft = (groupId) => getText(groupId, 'left_text', DEFAULT_LEFT)
const getWelcomeStatus = (groupId) => getFlag(groupId, 'welcome_on')
const getLeftStatus = (groupId) => getFlag(groupId, 'left_on')

// Baileys 6 sends JID strings, Baileys 7 sends objects
const participantJid = (p) => (typeof p === 'string' ? p : p?.id || p?.phoneNumber || '')

async function sendWelcomeOrLeft(sock, groupId, rawParticipant, groupSubject, message, imagePath) {
  const participant = participantJid(rawParticipant)
  if (!participant) return
  let profilePic = null
  try {
    profilePic = await sock.profilePictureUrl(participant, 'image')
  } catch {
    profilePic = null
  }

  const caption = message.replace('@user', `@${participant.split('@')[0]}`).replace('@group', groupSubject)
  const mentions = [participant]

  if (fs.existsSync(imagePath)) {
    await sock.sendMessage(groupId, { image: fs.readFileSync(imagePath), caption, mentions })
  } else if (profilePic) {
    await sock.sendMessage(groupId, { image: { url: profilePic }, caption, mentions })
  } else {
    await sock.sendMessage(groupId, { text: caption, mentions })
  }
}

const welcomeImagePath = path.join(import.meta.dirname, '../storage/media/image/welcome.jpg')
const leftImagePath = path.join(import.meta.dirname, '../storage/media/image/left.jpg')

async function welcomeHandler(sock, update) {
  try {
    const metadata = await sock.groupMetadata(update.id)

    if (update.action === 'add' && getWelcomeStatus(update.id)) {
      for (const participant of update.participants) {
        await sendWelcomeOrLeft(sock, update.id, participant, metadata.subject, getWelcome(update.id), welcomeImagePath)
      }
    } else if (update.action === 'remove' && getLeftStatus(update.id)) {
      for (const participant of update.participants) {
        await sendWelcomeOrLeft(sock, update.id, participant, metadata.subject, getLeft(update.id), leftImagePath)
      }
    }
  } catch (err) {
    console.error('Welcome/Left handler error:', err)
  }
}

export {
  welcomeHandler,
  setWelcome,
  setLeft,
  getWelcome,
  getLeft,
  setWelcomeStatus,
  setLeftStatus,
  getWelcomeStatus,
  getLeftStatus,
}
