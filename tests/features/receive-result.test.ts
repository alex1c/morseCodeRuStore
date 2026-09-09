/**
 * Receive result summary helpers.
 */

import { buildReceiveSessionResult } from '@/src/features/receive'

describe('receive result', () => {
	test('aggregates accuracy, response time and confusion pairs', () => {
		const result = buildReceiveSessionResult([
			{
				questionId: '1',
				expectedSymbolId: 'ru-zh',
				selectedSymbolId: 'ru-f',
				correct: false,
				responseTimeMs: 1000,
				replayCount: 0,
			},
			{
				questionId: '2',
				expectedSymbolId: 'ru-zh',
				selectedSymbolId: 'ru-f',
				correct: false,
				responseTimeMs: 800,
				replayCount: 1,
			},
			{
				questionId: '3',
				expectedSymbolId: 'ru-a',
				selectedSymbolId: 'ru-a',
				correct: true,
				responseTimeMs: 400,
				replayCount: 0,
			},
		])
		expect(result.correct).toBe(1)
		expect(result.total).toBe(3)
		expect(result.accuracyPercent).toBe(33)
		expect(result.averageResponseTimeMs).toBe(733)
		expect(result.confusionPairs[0]).toEqual({
			expectedSymbolId: 'ru-zh',
			answerSymbolId: 'ru-f',
			count: 2,
		})
	})
})
