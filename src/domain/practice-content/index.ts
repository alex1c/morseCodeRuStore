/**
 * Public practice-content domain API (Phase 7).
 */

export type {
	AlignOperation,
	AlignStep,
	AlignmentResult,
} from './alignment'
export { alignListeningAnswer } from './alignment'

export type {
	DigitGroupLength,
	GroupLength,
	PracticeAlphabet,
	PracticeContentKind,
	PracticeItem,
	WordLengthTier,
} from './types'

export {
	assertSymbolExists,
	characterToSymbolId,
	isItemEligible,
	normalizePracticeText,
	symbolCountOfText,
	textToRequiredSymbolIds,
} from './symbols'

export {
	YO_POLICY_NOTE,
} from './ru-corpus'
export {
	RU_PHRASES,
	RU_WORDS,
} from './ru-corpus'
export {
	LATIN_PHRASES,
	LATIN_WORDS,
} from './latin-corpus'

export {
	filterEligibleItems,
	getPhraseItems,
	getWordItems,
	validateCorpus,
	wordMatchesLengthTier,
} from './catalog'

export type { GenerateRandomGroupInput } from './group-generator'
export {
	generateRandomGroup,
	isDigitSymbolId,
	listDigitIdSet,
	pickNextGroupSymbol,
	pickWeightedId,
	resolveGroupPool,
	sanitizeListeningPoolIds,
} from './group-generator'

export type { GenerateDigitGroupInput } from './digit-generator'
export { generateDigitGroup } from './digit-generator'

export type { PickWordsInput } from './word-generator'
export {
	pickWords,
	scoreWordForWeights,
} from './word-generator'

export type { PickPhrasesInput } from './phrase-generator'
export { pickPhrases } from './phrase-generator'

export type { GenerateMixedGroupInput } from './mixed-generator'
export { generateMixedGroup } from './mixed-generator'

export type { SymbolAttemptFromAlignment } from './stats-from-alignment'
export { symbolAttemptsFromAlignment } from './stats-from-alignment'

export type {
	BuildPracticeSessionInput,
	PracticeSessionContentKind,
	PracticeSessionLength,
	PracticeSessionPlan,
} from './session-plan'
export { buildPracticeSessionPlan } from './session-plan'
