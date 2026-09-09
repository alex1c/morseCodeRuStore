/**
 * Lesson answer recording rules for SymbolStats.
 */

import { applyAttemptToStats } from '@/src/domain'
import { createEmptySymbolStats } from '@/src/types'

describe('lesson stats attempt rules', () => {
	test('one question maps to one attempt with directional confusion', () => {
		const first = applyAttemptToStats(createEmptySymbolStats('ru-a'), {
			isCorrect: false,
			responseTimeMs: null,
			practicedAt: '2026-09-09T12:00:00.000Z',
			answerSymbolId: 'ru-n',
		})
		expect(first.attempts).toBe(1)
		expect(first.incorrect).toBe(1)
		expect(first.averageResponseTimeMs).toBe(0)
		expect(first.confusionMap['ru-n']).toBe(1)

		const second = applyAttemptToStats(first, {
			isCorrect: true,
			responseTimeMs: null,
			practicedAt: '2026-09-09T12:01:00.000Z',
		})
		expect(second.attempts).toBe(2)
		expect(second.correct).toBe(1)
		// Replay is UI-gated; domain only records confirmed answers.
		expect(second.confusionMap['ru-n']).toBe(1)
	})
})
