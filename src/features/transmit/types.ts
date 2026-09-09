/**
 * Transmit mode contracts.
 */

import type { MorseElement } from '@/src/domain/morse'
import type { PressQualityBucket } from '@/src/domain/transmit'

export type TransmitAlphabet = 'RU' | 'LATIN'

export type TransmitSymbolPreset =
	| 'known'
	| 'weak'
	| 'all-available'
	| 'custom'

export type TransmitSessionLength = 10 | 20 | 50

export type TransmitSettings = {
	alphabet: TransmitAlphabet
	symbolPreset: TransmitSymbolPreset
	customSymbolIds: string[]
	sessionLength: TransmitSessionLength
	characterWpm: number
	toneFrequencyHz: number
}

export type TransmitQuestion = {
	id: string
	symbolId: string
}

export type TransmitPressRecord = {
	element: MorseElement
	durationMs: number
	quality: PressQualityBucket
}

export type TransmitAnswerRecord = {
	questionId: string
	symbolId: string
	correct: boolean
	hintUsed: boolean
	presses: TransmitPressRecord[]
	timingSummary: 'good' | 'needsPractice'
	averageQualityScore: number
}

export type TransmitSessionResult = {
	correct: number
	total: number
	accuracyPercent: number
	timingSummary: 'good' | 'needsPractice'
	hintsUsed: number
	errorCounts: { symbolId: string; count: number }[]
}

export type TransmitMachineState =
	| 'idle'
	| 'ready'
	| 'keyDown'
	| 'collecting'
	| 'evaluating'
	| 'feedbackCorrect'
	| 'feedbackWrong'
	| 'retrying'
	| 'advancing'
	| 'finished'
	| 'cancelled'

export type TransmitSymbolStats = {
	symbolId: string
	attempts: number
	correct: number
	incorrect: number
	hintsUsed: number
	averageQualityScore: number
	lastPracticedAt: string | null
}

export type TransmitSymbolStatsMap = Record<string, TransmitSymbolStats>
