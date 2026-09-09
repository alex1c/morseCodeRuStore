/**
 * WAV tone builder — pure JS, no native runtime required.
 */

import { buildToneWavDataUri } from '@/src/features/morseAudio/wavTone'

describe('buildToneWavDataUri', () => {
	test('returns a wav data uri with expected header', () => {
		const uri = buildToneWavDataUri(600, 60)
		expect(uri.startsWith('data:audio/wav;base64,')).toBe(true)
		const base64 = uri.replace('data:audio/wav;base64,', '')
		const binary = Uint8Array.from(
			atob(base64),
			(char) => char.charCodeAt(0),
		)
		expect(
			String.fromCharCode(binary[0], binary[1], binary[2], binary[3]),
		).toBe('RIFF')
		expect(
			String.fromCharCode(binary[8], binary[9], binary[10], binary[11]),
		).toBe('WAVE')
	})
})
