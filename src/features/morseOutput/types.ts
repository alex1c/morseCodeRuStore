/**
 * Morse tool output modes — audio / vibration / flashlight.
 * All modes consume the same canonical MorseTimeline.
 */

export type MorseOutputMode = 'audio' | 'vibration' | 'flashlight'

export type MorseOutputTiming = {
	characterWpm: number
	farnsworthMultiplier: number
	frequencyHz: number
}

export type MorseOutputRequest = {
	mode: MorseOutputMode
	/** Plain text to encode (preferred for multi-char). */
	text?: string
	alphabet?: 'RU' | 'LATIN'
	/** Or a single catalog symbol code. */
	code?: import('@/src/domain/morse').MorseElement[]
	timing: MorseOutputTiming
	/** Optional character highlight (non-space index or string index). */
	onActiveCharacterIndex?: (index: number) => void
	onProgress?: (info: { playing: boolean; mode: MorseOutputMode }) => void
}

export type MorseOutputResult =
	| { ok: true }
	| { ok: false; error: string }

/** Max characters encoded for a single tool playback (translation itself is not truncated). */
export const TOOL_PLAYBACK_MAX_CHARS = 200

/** Practical flashlight WPM ceiling (LED/camera latency). */
export const FLASHLIGHT_MAX_WPM = 20

/**
 * Android short vibrations below this are often inaudible as pulses.
 * Applied only to tone events; documented clamp for hardware feel.
 */
export const VIBRATION_MIN_TONE_MS = 30
