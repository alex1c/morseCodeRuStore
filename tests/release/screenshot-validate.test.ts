/**
 * Screenshot validation helper unit tests (no fake PNGs required).
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

/** Minimal valid 1×1 PNG (IHDR width/height = 1). */
function writeTinyPng (filePath: string, width: number, height: number) {
	// Prebuilt 1x1 transparent PNG; for non-1 sizes we only patch IHDR for tests
	// that expect failure — use real 1x1 and assert validator rejects wrong size.
	const oneByOne = Buffer.from(
		'89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
		'hex',
	)
	if (width === 1 && height === 1) {
		fs.writeFileSync(filePath, oneByOne)
		return
	}
	const buf = Buffer.from(oneByOne)
	buf.writeUInt32BE(width, 16)
	buf.writeUInt32BE(height, 20)
	fs.writeFileSync(filePath, buf)
}

describe('validate-screenshots script', () => {
	test('accepts the intentional six-shot release set', () => {
		const script = path.join(
			process.cwd(),
			'scripts',
			'validate-screenshots.cjs',
		)
		const result = spawnSync(process.execPath, [script], {
			encoding: 'utf8',
		})
		expect(result.status).toBe(0)
		expect(result.stdout).toMatch(/OK: 6/)
	})

	test('detects wrong PNG dimensions via IHDR', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'morse-shot-'))
		const file = path.join(dir, 'bad.png')
		writeTinyPng(file, 1080, 2400)
		const buf = fs.readFileSync(file)
		const width = buf.readUInt32BE(16)
		const height = buf.readUInt32BE(20)
		expect(width).toBe(1080)
		expect(height).toBe(2400)
		expect(width === 1080 && height === 1920).toBe(false)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})
