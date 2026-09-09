/**
 * Build Transmit session result summary.
 */

import type { TransmitAnswerRecord, TransmitSessionResult } from './types'

export function buildTransmitSessionResult (
	answered: TransmitAnswerRecord[],
): TransmitSessionResult {
	const total = answered.length
	const correct = answered.filter((item) => item.correct).length
	const accuracyPercent =
		total <= 0 ? 0 : Math.round((correct / total) * 100)
	const hintsUsed = answered.filter((item) => item.hintUsed).length

	const qualityScores = answered.map((item) => item.averageQualityScore)
	const avgQuality =
		qualityScores.length === 0
			? 0
			: qualityScores.reduce((sum, value) => sum + value, 0) /
				qualityScores.length
	const timingSummary =
		avgQuality >= 0.75 ? 'good' : 'needsPractice'

	const errorCounts = new Map<string, number>()
	for (const item of answered) {
		if (item.correct) {
			continue
		}
		errorCounts.set(
			item.symbolId,
			(errorCounts.get(item.symbolId) ?? 0) + 1,
		)
	}

	return {
		correct,
		total,
		accuracyPercent,
		timingSummary,
		hintsUsed,
		errorCounts: [...errorCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([symbolId, count]) => ({ symbolId, count })),
	}
}

export function applyTransmitAttempt (
	previous: {
		symbolId: string
		attempts: number
		correct: number
		incorrect: number
		hintsUsed: number
		averageQualityScore: number
		lastPracticedAt: string | null
	},
	input: {
		isCorrect: boolean
		hintUsed: boolean
		averageQualityScore: number
		practicedAt: string
	},
) {
	const attempts = previous.attempts + 1
	const correct = previous.correct + (input.isCorrect ? 1 : 0)
	const incorrect = previous.incorrect + (input.isCorrect ? 0 : 1)
	const hintsUsed = previous.hintsUsed + (input.hintUsed ? 1 : 0)
	const averageQualityScore =
		previous.attempts === 0
			? input.averageQualityScore
			: Math.round(
				((previous.averageQualityScore * previous.attempts +
					input.averageQualityScore) /
					attempts) *
					1000,
			) / 1000
	return {
		symbolId: previous.symbolId,
		attempts,
		correct,
		incorrect,
		hintsUsed,
		averageQualityScore,
		lastPracticedAt: input.practicedAt,
	}
}
