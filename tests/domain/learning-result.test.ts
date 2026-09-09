import { buildLessonResult, LESSON_PASS_THRESHOLD_PERCENT } from '@/src/domain'

describe('lesson result', () => {
	test('calculates score and pass threshold boundary', () => {
		const base = Array.from({ length: 20 }).map((_, i) => ({
			questionId: `q-${i}`,
			expectedSymbolId: i % 2 === 0 ? 'ru-a' : 'ru-t',
			selectedSymbolId: i < 17 ? (i % 2 === 0 ? 'ru-a' : 'ru-t') : 'ru-o',
			correct: i < 17,
		}))
		const result = buildLessonResult('ru-lesson-1', 'ru-main', base)
		expect(result.correct).toBe(17)
		expect(result.total).toBe(20)
		expect(result.accuracyPercent).toBe(85)
		expect(result.passed).toBe(true)
		expect(LESSON_PASS_THRESHOLD_PERCENT).toBe(85)
	})
})
