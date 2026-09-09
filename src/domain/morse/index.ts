/**
 * Public Morse domain boundary for Phase 1–2.
 * Audio engine must live behind this folder later — not in screens.
 */

export type {
	AlphabetType,
	MorseCategory,
	MorseElement,
	MorseSymbol,
} from './types'
export {
	applyAttemptToStats,
	calculateAccuracyPercent,
	patternToSequence,
	sequenceToPattern,
} from './types'
export {
	SAMPLE_MORSE_SYMBOLS,
	getSampleSymbolById,
	getSampleSymbolsForLesson,
} from './catalog'
