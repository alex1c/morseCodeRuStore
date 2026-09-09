/**
 * Public Morse domain boundary — Phase 2 engine surface.
 */

export type {
	AlphabetContext,
	AlphabetFamily,
	AlphabetType,
	MorseCategory,
	MorseElement,
	MorseSymbol,
} from './types'
export {
	applyAttemptToStats,
	calculateAccuracyPercent,
} from './types'

export {
	codeToPattern,
	patternToCode,
	patternToSequence,
	sequenceToPattern,
} from './elements'

export {
	MORSE_CATALOG,
	SAMPLE_MORSE_SYMBOLS,
	getSampleSymbolById,
	getSampleSymbolsForLesson,
} from './catalog'

export {
	findCrossAlphabetPatternCollisions,
	getSymbolById,
	getSymbolsForContext,
	listDigits,
	listLatinLetters,
	listPunctuation,
	listRussianLetters,
	lookupSymbolForDecode,
	lookupSymbolForEncode,
} from './alphabets'

export {
	normalizeText,
	type NormalizeTextResult,
} from './normalize'

export {
	decodeMorseText,
	decodePatternWords,
	encodeText,
	encodeTextToPatternString,
	type DecodeMorseOptions,
	type DecodeMorseResult,
	type DecodedToken,
	type EncodeTextOptions,
	type EncodeTextResult,
	type EncodedSymbol,
} from './codec'

export {
	TIMING_UNITS,
	createTimingModel,
	createTimingModelFromPreferences,
	durationMsFromUnits,
	farnsworthMultiplierFromSpeeds,
	unitMsFromWpm,
	type CreateTimingModelInput,
	type TimingModel,
} from './timing'

export {
	buildTimelineForCode,
	buildTimelineForText,
	buildTimelineFromTokens,
	type BuildTimelineForTextOptions,
	type MorseTimeline,
	type TimelineEvent,
} from './timeline'

export {
	isValidMorseCode,
	isValidMorsePattern,
	validateCatalogIntegrity,
} from './validation'
