/**
 * Receive mode contracts — independent listening practice sessions.
 */

export type ReceiveAlphabet = 'RU' | 'LATIN'

export type ReceiveAnswerMode = 'choices' | 'keyboard' | 'paper'

export type ReceiveSymbolPreset =
	| 'known'
	| 'weak'
	| 'adaptive'
	| 'all-available'
	| 'custom'

export type ReceiveContentKind =
	| 'symbol'
	| 'group'
	| 'word'
	| 'phrase'
	| 'digits'

export type ReceiveSessionLength = 5 | 10 | 20 | 50 | 'infinite'

export type ReceiveSettings = {
	alphabet: ReceiveAlphabet
	answerMode: ReceiveAnswerMode
	symbolPreset: ReceiveSymbolPreset
	customSymbolIds: string[]
	sessionLength: ReceiveSessionLength
	characterWpm: number
	farnsworthMultiplier: number
	toneFrequencyHz: number
	/** What material to practice this session. */
	contentKind: ReceiveContentKind
	/** Random / mixed letter group length. */
	groupLength: 2 | 3 | 4 | 5
	/** Digit-only group length. */
	digitGroupLength: 1 | 2 | 3 | 4 | 5
	/** Word corpus length tier. */
	wordLengthTier: 'short' | 'medium' | 'long' | 'mixed'
	/** Letters+digits for groups only when the user opts in. */
	includeMixedDigits: boolean
}

export type ReceiveQuestion = {
	id: string
	contentKind: ReceiveContentKind
	/** Symbol mode: the symbol. Multi-char: first required symbol id (compat). */
	symbolId: string
	text: string
	requiredSymbolIds: string[]
	optionSymbolIds: string[]
}

export type ReceiveAnswerRecord = {
	questionId: string
	expectedSymbolId: string
	selectedSymbolId: string | null
	correct: boolean
	responseTimeMs: number | null
	replayCount: number
	expectedText: string
	answeredText: string | null
	characterMatches: number
	characterTotal: number
	/** null for paper / symbol choices without alignment */
	alignment: import('@/src/domain').AlignmentResult | null
	/** paper self-check: do not invent per-symbol stats */
	paperSelfCheck: boolean
}

export type ReceiveSessionResult = {
	correct: number
	total: number
	accuracyPercent: number
	averageResponseTimeMs: number | null
	strongSymbolIds: string[]
	errorCounts: { symbolId: string; count: number }[]
	confusionPairs: {
		expectedSymbolId: string
		answerSymbolId: string
		count: number
	}[]
	characterCorrect: number
	characterTotal: number
	characterAccuracyPercent: number
	wrongItems: {
		text: string
		contentKind: ReceiveContentKind
		requiredSymbolIds: string[]
	}[]
}

export type ReceiveMachineState =
	| 'idle'
	| 'preparing'
	| 'playing'
	| 'awaitingAnswer'
	| 'feedbackCorrect'
	| 'feedbackWrong'
	| 'replaying'
	| 'advancing'
	| 'finished'
	| 'cancelled'
