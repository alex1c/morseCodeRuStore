/**
 * Transmit UX constants.
 */

export const TRANSMIT_WPM_MIN = 5
export const TRANSMIT_WPM_MAX = 40
export const TRANSMIT_WPM_STEP = 1

export const TRANSMIT_TONE_MIN = 400
export const TRANSMIT_TONE_MAX = 1000
export const TRANSMIT_TONE_STEP = 50

/** Cap entered elements so runaway presses stay bounded. */
export const TRANSMIT_MAX_ELEMENTS = 6

/** Soft auto-check delay after reaching exact target length (ms). */
export const TRANSMIT_AUTO_EVAL_DELAY_MS = 450

export const DEFAULT_TRANSMIT_SETTINGS = {
	alphabet: 'RU' as const,
	symbolPreset: 'known' as const,
	customSymbolIds: [] as string[],
	sessionLength: 20 as const,
	characterWpm: 12,
	toneFrequencyHz: 600,
}

export function createEmptyTransmitSymbolStats (
	symbolId: string,
): import('./types').TransmitSymbolStats {
	return {
		symbolId,
		attempts: 0,
		correct: 0,
		incorrect: 0,
		hintsUsed: 0,
		averageQualityScore: 0,
		lastPracticedAt: null,
	}
}
