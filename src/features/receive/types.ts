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

export type ReceiveSessionLength = 10 | 20 | 50 | 'infinite'

export type ReceiveSettings = {
	alphabet: ReceiveAlphabet
	answerMode: ReceiveAnswerMode
	symbolPreset: ReceiveSymbolPreset
	customSymbolIds: string[]
	sessionLength: ReceiveSessionLength
	characterWpm: number
	farnsworthMultiplier: number
	toneFrequencyHz: number
}

export type ReceiveQuestion = {
	id: string
	symbolId: string
	optionSymbolIds: string[]
}

export type ReceiveAnswerRecord = {
	questionId: string
	expectedSymbolId: string
	selectedSymbolId: string | null
	correct: boolean
	responseTimeMs: number | null
	replayCount: number
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
