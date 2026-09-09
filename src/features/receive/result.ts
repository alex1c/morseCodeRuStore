/**
 * Build Receive session result summary from answered records.
 */

import type { ReceiveAnswerRecord, ReceiveSessionResult } from './types'

export function buildReceiveSessionResult (
	answered: ReceiveAnswerRecord[],
): ReceiveSessionResult {
	const total = answered.length
	const correct = answered.filter((item) => item.correct).length
	const accuracyPercent =
		total <= 0 ? 0 : Math.round((correct / total) * 100)

	const timed = answered
		.map((item) => item.responseTimeMs)
		.filter((ms): ms is number => typeof ms === 'number')
	const averageResponseTimeMs =
		timed.length === 0
			? null
			: Math.round(
				timed.reduce((sum, ms) => sum + ms, 0) / timed.length,
			)

	const correctBySymbol = new Map<string, number>()
	const errorCounts = new Map<string, number>()
	const confusion = new Map<string, number>()

	for (const item of answered) {
		if (item.correct) {
			correctBySymbol.set(
				item.expectedSymbolId,
				(correctBySymbol.get(item.expectedSymbolId) ?? 0) + 1,
			)
			continue
		}
		errorCounts.set(
			item.expectedSymbolId,
			(errorCounts.get(item.expectedSymbolId) ?? 0) + 1,
		)
		if (item.selectedSymbolId) {
			const key = `${item.expectedSymbolId}|${item.selectedSymbolId}`
			confusion.set(key, (confusion.get(key) ?? 0) + 1)
		}
	}

	const strongSymbolIds = [...correctBySymbol.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([symbolId]) => symbolId)

	return {
		correct,
		total,
		accuracyPercent,
		averageResponseTimeMs,
		strongSymbolIds,
		errorCounts: [...errorCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([symbolId, count]) => ({ symbolId, count })),
		confusionPairs: [...confusion.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([key, count]) => {
				const [expectedSymbolId, answerSymbolId] = key.split('|')
				return { expectedSymbolId, answerSymbolId, count }
			}),
	}
}
