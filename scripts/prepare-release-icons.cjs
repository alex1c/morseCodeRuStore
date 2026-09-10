/**
 * Prepare RuStore 512×512 icon from assets/icon_gpt.png master.
 * Does not invent artwork — exits if master is missing.
 *
 * Usage: node scripts/prepare-release-icons.cjs
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MASTER = path.join(ROOT, 'assets', 'icon_gpt.png')
const OUT_512 = path.join(ROOT, 'release-artifacts', 'icon-512.png')

function readPngSize (filePath) {
	const buf = fs.readFileSync(filePath)
	if (buf.length < 24 || buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
		throw new Error('master is not a valid PNG')
	}
	return {
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
	}
}

function main () {
	if (!fs.existsSync(MASTER)) {
		console.error('MASTER ICON REQUIRED: place approved art at assets/icon_gpt.png')
		console.error('See assets/ICON_MASTER.md')
		process.exitCode = 2
		return
	}

	const size = readPngSize(MASTER)
	console.log(`Master: ${size.width}x${size.height}`)

	if (size.width < 512 || size.height < 512) {
		console.error('Master must be at least 512×512 — do not upscale a tiny raster.')
		process.exitCode = 1
		return
	}

	if (size.width === 512 && size.height === 512) {
		fs.mkdirSync(path.dirname(OUT_512), { recursive: true })
		fs.copyFileSync(MASTER, OUT_512)
		console.log(`Wrote ${OUT_512}`)
		console.log('Next: sync assets/icon.png + adaptive icons from the same master.')
		return
	}

	console.log('Master is larger than 512×512.')
	console.log('Export a square 512×512 crop/center from the master (no stretch),')
	console.log(`then save as ${OUT_512} and copy the same art to assets/icon.png.`)
}

main()
