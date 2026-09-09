/**
 * Procedural mono PCM WAV generator (16-bit) for short Morse tones.
 * Avoids shipping per-letter audio assets.
 */

function writeString (view: DataView, offset: number, value: string): void {
	for (let i = 0; i < value.length; i += 1) {
		view.setUint8(offset + i, value.charCodeAt(i))
	}
}

const BASE64_ALPHABET =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Pure base64 encoder — works in RN and Jest without Node Buffer typings. */
export function bytesToBase64 (bytes: Uint8Array): string {
	let output = ''
	for (let i = 0; i < bytes.length; i += 3) {
		const a = bytes[i] ?? 0
		const b = bytes[i + 1] ?? 0
		const c = bytes[i + 2] ?? 0
		const triplet = (a << 16) | (b << 8) | c
		output += BASE64_ALPHABET[(triplet >> 18) & 63]
		output += BASE64_ALPHABET[(triplet >> 12) & 63]
		output +=
			i + 1 < bytes.length
				? BASE64_ALPHABET[(triplet >> 6) & 63]
				: '='
		output +=
			i + 2 < bytes.length ? BASE64_ALPHABET[triplet & 63] : '='
	}
	return output
}

/**
 * Build a sine-wave WAV as a base64 data URI for expo-av.
 * Includes a tiny fade in/out to reduce clicks.
 */
export function buildToneWavDataUri (
	frequencyHz: number,
	durationMs: number,
	sampleRate = 22050,
): string {
	const safeDurationMs = Math.max(1, durationMs)
	const sampleCount = Math.max(
		1,
		Math.round((sampleRate * safeDurationMs) / 1000),
	)
	const dataSize = sampleCount * 2
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)

	writeString(view, 0, 'RIFF')
	view.setUint32(4, 36 + dataSize, true)
	writeString(view, 8, 'WAVE')
	writeString(view, 12, 'fmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true) // PCM
	view.setUint16(22, 1, true) // mono
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, sampleRate * 2, true)
	view.setUint16(32, 2, true)
	view.setUint16(34, 16, true)
	writeString(view, 36, 'data')
	view.setUint32(40, dataSize, true)

	const fadeSamples = Math.min(48, Math.floor(sampleCount / 4))
	const amplitude = 0.35

	for (let i = 0; i < sampleCount; i += 1) {
		const t = i / sampleRate
		let envelope = 1
		if (i < fadeSamples) {
			envelope = i / fadeSamples
		} else if (i > sampleCount - fadeSamples) {
			envelope = (sampleCount - i) / fadeSamples
		}
		const sample =
			Math.sin(2 * Math.PI * frequencyHz * t) * amplitude * envelope
		const intSample = Math.max(
			-32767,
			Math.min(32767, Math.round(sample * 32767)),
		)
		view.setInt16(44 + i * 2, intSample, true)
	}

	const bytes = new Uint8Array(buffer)
	return `data:audio/wav;base64,${bytesToBase64(bytes)}`
}
