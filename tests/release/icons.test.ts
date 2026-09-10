/**
 * Icon release validation — master + derived 512×512 RuStore asset.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ROOT = path.join(__dirname, '../..')

function readPngSize (filePath: string) {
	const buf = fs.readFileSync(filePath)
	expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
	return {
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
		bytes: buf.length,
		sha256: crypto.createHash('sha256').update(buf).digest('hex'),
	}
}

describe('release icons from approved master', () => {
	const masterPath = path.join(ROOT, 'assets', 'icon_gpt.png')
	const icon512 = path.join(ROOT, 'release-artifacts', 'icon-512.png')
	const launcher = path.join(ROOT, 'assets', 'icon.png')
	const foreground = path.join(ROOT, 'assets', 'android-icon-foreground.png')

	test('master icon exists and is a square PNG ≥ 512', () => {
		expect(fs.existsSync(masterPath)).toBe(true)
		const m = readPngSize(masterPath)
		expect(m.width).toBe(m.height)
		expect(m.width).toBeGreaterThanOrEqual(512)
	})

	test('RuStore icon-512 is exact 512×512 PNG', () => {
		expect(fs.existsSync(icon512)).toBe(true)
		const s = readPngSize(icon512)
		expect(s.width).toBe(512)
		expect(s.height).toBe(512)
	})

	test('launcher and adaptive foreground exist as square PNGs', () => {
		expect(fs.existsSync(launcher)).toBe(true)
		expect(fs.existsSync(foreground)).toBe(true)
		const l = readPngSize(launcher)
		const f = readPngSize(foreground)
		expect(l.width).toBe(l.height)
		expect(f.width).toBe(f.height)
		expect(l.width).toBeGreaterThanOrEqual(512)
	})
})
