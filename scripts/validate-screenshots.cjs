/**
 * Validate RuStore screenshots are exactly 1080×1920 PNG.
 * Does not invent screenshots — fails clearly when files are missing.
 *
 * Usage: node scripts/validate-screenshots.cjs
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DIR = path.join(ROOT, 'release-artifacts', 'screenshots')
const EXPECTED = [
	'01-home.png',
	'02-learning.png',
	'03-visual-morse.png',
	'04-receive.png',
	'05-transmit.png',
	'06-words.png',
	'07-adaptive.png',
	'08-stats.png',
]
const WIDTH = 1080
const HEIGHT = 1920

function readPngSize (filePath) {
	const buf = fs.readFileSync(filePath)
	if (buf.length < 24) {
		throw new Error('file too small to be PNG')
	}
	const sig = buf.subarray(0, 8).toString('hex')
	if (sig !== '89504e470d0a1a0a') {
		throw new Error('not a PNG')
	}
	return {
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
	}
}

function main () {
	const missing = []
	const bad = []
	const ok = []

	for (const name of EXPECTED) {
		const filePath = path.join(DIR, name)
		if (!fs.existsSync(filePath)) {
			missing.push(name)
			continue
		}
		try {
			const { width, height } = readPngSize(filePath)
			if (width !== WIDTH || height !== HEIGHT) {
				bad.push(`${name} is ${width}x${height}, expected ${WIDTH}x${HEIGHT}`)
			} else {
				ok.push(name)
			}
		} catch (err) {
			bad.push(`${name}: ${err.message}`)
		}
	}

	console.log(`OK: ${ok.length}`)
	ok.forEach((name) => console.log(`  ✓ ${name}`))
	if (missing.length) {
		console.log(`MISSING: ${missing.length}`)
		missing.forEach((name) => console.log(`  · ${name}`))
	}
	if (bad.length) {
		console.log(`INVALID: ${bad.length}`)
		bad.forEach((line) => console.log(`  ✗ ${line}`))
	}

	if (missing.length || bad.length) {
		process.exitCode = 1
		console.log('SCREENSHOTS CAPTURE PENDING or resize required.')
		return
	}
	console.log('All screenshots are 1080x1920.')
}

main()
