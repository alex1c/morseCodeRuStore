/**
 * Compare target Morse code vs transmitted classified sequence.
 * Timing quality is advisory — never fails the question alone.
 */

import type { MorseElement } from '@/src/domain/morse'
import type { PressQualityBucket } from './classify'

export type TransmittedElement = {
	element: MorseElement
	durationMs: number
	quality: PressQualityBucket
}

export type TransmitEvaluation = {
	exactMatch: boolean
	target: MorseElement[]
	sent: MorseElement[]
	mismatches: { index: number; expected: MorseElement | null; actual: MorseElement | null }[]
	missingCount: number
	extraCount: number
	/** Overall rhythm label from element qualities (advisory). */
	timingSummary: 'good' | 'needsPractice'
	averageQualityScore: number
}

function qualityScore (quality: PressQualityBucket): number {
	switch (quality) {
		case 'good':
			return 1
		case 'acceptable':
			return 0.7
		case 'tooShort':
		case 'tooLong':
			return 0.35
		default:
			return 0.5
	}
}

/**
 * Evaluate transmitted elements against the canonical target code.
 */
export function evaluateTransmitSequence (
	target: MorseElement[],
	sentElements: TransmittedElement[],
): TransmitEvaluation {
	const sent = sentElements.map((item) => item.element)
	const maxLen = Math.max(target.length, sent.length)
	const mismatches: TransmitEvaluation['mismatches'] = []

	for (let i = 0; i < maxLen; i += 1) {
		const expected = target[i] ?? null
		const actual = sent[i] ?? null
		if (expected !== actual) {
			mismatches.push({ index: i, expected, actual })
		}
	}

	const missingCount = Math.max(0, target.length - sent.length)
	const extraCount = Math.max(0, sent.length - target.length)
	const exactMatch =
		mismatches.length === 0 &&
		target.length === sent.length

	const scores = sentElements.map((item) => qualityScore(item.quality))
	const averageQualityScore =
		scores.length === 0
			? 0
			: scores.reduce((sum, value) => sum + value, 0) / scores.length
	const timingSummary =
		averageQualityScore >= 0.75 ? 'good' : 'needsPractice'

	return {
		exactMatch,
		target,
		sent,
		mismatches,
		missingCount,
		extraCount,
		timingSummary,
		averageQualityScore,
	}
}

export function timingSummaryLabelRu (
	summary: TransmitEvaluation['timingSummary'],
): string {
	return summary === 'good' ? 'Хорошо' : 'Стоит потренировать'
}
