import * as ns from '@whiskeysockets/baileys'

const cjs = ns.default && typeof ns.default === 'object' ? ns.default : {}
const pick = (name) => ns[name] ?? cjs[name]

export const makeWASocket = ns.makeWASocket ?? (typeof ns.default === 'function' ? ns.default : cjs.default)
export const Browsers = pick('Browsers')
export const DisconnectReason = pick('DisconnectReason')
export const useMultiFileAuthState = pick('useMultiFileAuthState')
export const fetchLatestWaWebVersion = pick('fetchLatestWaWebVersion')
export const jidDecode = pick('jidDecode')
export const proto = pick('proto')
export const getContentType = pick('getContentType')
export const downloadContentFromMessage = pick('downloadContentFromMessage')
export const generateWAMessageFromContent = pick('generateWAMessageFromContent')
export const prepareWAMessageMedia = pick('prepareWAMessageMedia')
