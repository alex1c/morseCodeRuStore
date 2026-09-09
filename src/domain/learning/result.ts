import type { LessonQuestionResult, LessonResult } from './types'

export const LESSON_PASS_THRESHOLD_PERCENT = 85

export function buildLessonResult (
	lessonId: string,
	courseId: LessonResult['courseId'],
	results: LessonQuestionResult[],
): LessonResult {
	const total = results.length
	const correct = results.filter((item) => item.correct).length
	const accuracyPercent = total <= 0 ? 0 : Math.round((correct / total) * 100)
	const wrongBySymbol = new Map<string, number>()
	for (const result of results) {
		if (result.correct) {
			continue
		}
		wrongBySymbol.set(
			result.expectedSymbolId,
			(wrongBySymbol.get(result.expectedSymbolId) ?? 0) + 1,
		)
	}
	const weakSymbolIds = [...wrongBySymbol.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([symbolId]) => symbolId)
	return {
		lessonId,
		courseId,
		correct,
		total,
		accuracyPercent,
		passed: accuracyPercent >= LESSON_PASS_THRESHOLD_PERCENT,
		weakSymbolIds,
	}
}
