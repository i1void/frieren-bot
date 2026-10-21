const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const ff = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
ff.setFfmpegPath(ffmpegPath)

function tmpFile(ext) {
  return path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.${ext}`)
}

function runFfmpeg(inputPath, outputPath, args) {
  return new Promise((resolve, reject) => {
    ff(inputPath)
      .addOutputOptions(args)
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath)
  })
}

async function convertToMp3(buffer) {
  const input = tmpFile('in')
  const output = tmpFile('mp3')
  fs.writeFileSync(input, buffer)
  await runFfmpeg(input, output, ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k'])
  const result = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return result
}

async function convertToOpus(buffer) {
  const input = tmpFile('in')
  const output = tmpFile('ogg')
  fs.writeFileSync(input, buffer)
  await runFfmpeg(input, output, ['-vn', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1'])
  const result = fs.readFileSync(output)
  fs.unlinkSync(input)
  fs.unlinkSync(output)
  return result
}

// Animated WebP files carry an "ANIM" chunk right after the header.
const isAnimatedWebp = (buffer) => buffer.subarray(0, 64).includes('ANIM')

async function convertWebpToPng(buffer) {
  const input = tmpFile('webp')
  const output = tmpFile('png')
  fs.writeFileSync(input, buffer)
  try {
    await runFfmpeg(input, output, ['-frames:v', '1'])
    return fs.readFileSync(output)
  } finally {
    fs.rmSync(input, { force: true })
    fs.rmSync(output, { force: true })
  }
}

module.exports = { convertToMp3, convertToOpus, convertWebpToPng, isAnimatedWebp }
