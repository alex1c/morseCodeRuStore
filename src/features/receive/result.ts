/**
 * Build Receive session result summary from answered records.
 */

import type {
	ReceiveAnswerRecord,
	ReceiveQuestion,
	ReceiveSessionResult,
} from './types'

export function buildReceiveSessionResult (
	answered: ReceiveAnswerRecord[],
	questions: ReceiveQuestion[] = [],
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
	const questionById = new Map(questions.map((q) => [q.id, q]))

	let characterCorrect = 0
	let characterTotal = 0
	const wrongItems: ReceiveSessionResult['wrongItems'] = []

	for (const item of answered) {
		characterCorrect += item.characterMatches ?? 0
		characterTotal += item.characterTotal ?? 0

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

		const question = questionById.get(item.questionId)
		wrongItems.push({
			text: item.expectedText || question?.text || item.expectedSymbolId,
			contentKind: question?.contentKind ?? 'symbol',
			requiredSymbolIds:
				question?.requiredSymbolIds ?? [item.expectedSymbolId],
		})
	}

	const strongSymbolIds = [...correctBySymbol.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([symbolId]) => symbolId)

	const characterAccuracyPercent =
		characterTotal <= 0
			? 0
			: Math.round((characterCorrect / characterTotal) * 100)

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
		characterCorrect,
		characterTotal,
		characterAccuracyPercent,
		wrongItems,
	}
}
