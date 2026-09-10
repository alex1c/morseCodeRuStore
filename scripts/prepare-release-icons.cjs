/**
 * Prepare release icons from assets/icon_gpt.png (approved master).
 * Downscales only — never invents artwork.
 *
 * Outputs:
 * - release-artifacts/icon-512.png (exact 512×512)
 * - assets/icon.png (1024×1024 Expo launcher)
 * - assets/android-icon-foreground.png (1024 with safe-zone padding)
 * - assets/android-icon-background.png (solid navy matching master)
 * - assets/android-icon-monochrome.png (simple silhouette for themed icon)
 * - assets/favicon.png (48×48)
 *
 * Usage: node scripts/prepare-release-icons.cjs
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.join(__dirname, '..')
const MASTER = path.join(ROOT, 'assets', 'icon_gpt.png')
const OUT_512 = path.join(ROOT, 'release-artifacts', 'icon-512.png')
const OUT_ICON = path.join(ROOT, 'assets', 'icon.png')
const OUT_FG = path.join(ROOT, 'assets', 'android-icon-foreground.png')
const OUT_BG = path.join(ROOT, 'assets', 'android-icon-background.png')
const OUT_MONO = path.join(ROOT, 'assets', 'android-icon-monochrome.png')
const OUT_FAVICON = path.join(ROOT, 'assets', 'favicon.png')

/** Navy from master backdrop — adaptive background only, not a redesign. */
const ADAPTIVE_BG = { r: 10, g: 22, b: 48, alpha: 1 }

/**
 * Adaptive icons clip outside the center ~66%. Scale master to 72% and
 * center on transparent canvas so key + Morse dots stay in safe zone.
 */
const ADAPTIVE_CONTENT_SCALE = 0.72

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

async function writeExactResize (input, output, size) {
	await sharp(input)
		.resize(size, size, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3,
		})
		.png()
		.toFile(output)
}

async function writeAdaptiveForeground (input, output, canvasSize) {
	const contentSize = Math.round(canvasSize * ADAPTIVE_CONTENT_SCALE)
	const resized = await sharp(input)
		.resize(contentSize, contentSize, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3,
		})
		.png()
		.toBuffer()

	await sharp({
		create: {
			width: canvasSize,
			height: canvasSize,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite([{ input: resized, gravity: 'centre' }])
		.png()
		.toFile(output)
}

async function writeSolidBackground (output, size) {
	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: ADAPTIVE_BG,
		},
	})
		.png()
		.toFile(output)
}

async function writeMonochrome (input, output, size) {
	// Themed icon: luminance silhouette from the same master (no new art).
	await sharp(input)
		.resize(size, size, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3,
		})
		.grayscale()
		.threshold(40)
		.png()
		.toFile(output)
}

async function main () {
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
	if (size.width !== size.height) {
		console.error('Master must be square.')
		process.exitCode = 1
		return
	}

	fs.mkdirSync(path.dirname(OUT_512), { recursive: true })

	await writeExactResize(MASTER, OUT_512, 512)
	await writeExactResize(MASTER, OUT_ICON, 1024)
	await writeAdaptiveForeground(MASTER, OUT_FG, 1024)
	await writeSolidBackground(OUT_BG, 1024)
	await writeMonochrome(MASTER, OUT_MONO, 1024)
	await writeExactResize(MASTER, OUT_FAVICON, 48)

	const verify512 = readPngSize(OUT_512)
	if (verify512.width !== 512 || verify512.height !== 512) {
		console.error('icon-512.png is not 512×512')
		process.exitCode = 1
		return
	}

	console.log(`Wrote ${OUT_512} (${verify512.width}x${verify512.height})`)
	console.log(`Wrote ${OUT_ICON}`)
	console.log(`Wrote ${OUT_FG} (safe-zone scale ${ADAPTIVE_CONTENT_SCALE})`)
	console.log(`Wrote ${OUT_BG}`)
	console.log(`Wrote ${OUT_MONO}`)
	console.log(`Wrote ${OUT_FAVICON}`)
	console.log('Done — same visual master, downscale + adaptive padding only.')
}

main().catch((err) => {
	console.error(err)
	process.exitCode = 1
})
