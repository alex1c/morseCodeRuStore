/**
 * Receive result summary helpers.
 */

import { buildReceiveSessionResult } from '@/src/features/receive'

describe('receive result', () => {
	test('aggregates accuracy, response time and confusion pairs', () => {
		const result = buildReceiveSessionResult(
			[
				{
					questionId: '1',
					expectedSymbolId: 'ru-zh',
					selectedSymbolId: 'ru-f',
					correct: false,
					responseTimeMs: 1000,
					replayCount: 0,
					expectedText: 'Ж',
					answeredText: 'Ф',
					characterMatches: 0,
					characterTotal: 1,
					alignment: null,
					paperSelfCheck: false,
				},
				{
					questionId: '2',
					expectedSymbolId: 'ru-zh',
					selectedSymbolId: 'ru-f',
					correct: false,
					responseTimeMs: 800,
					replayCount: 1,
					expectedText: 'Ж',
					answeredText: 'Ф',
					characterMatches: 0,
					characterTotal: 1,
					alignment: null,
					paperSelfCheck: false,
				},
				{
					questionId: '3',
					expectedSymbolId: 'ru-a',
					selectedSymbolId: 'ru-a',
					correct: true,
					responseTimeMs: 400,
					replayCount: 0,
					expectedText: 'А',
					answeredText: 'А',
					characterMatches: 1,
					characterTotal: 1,
					alignment: null,
					paperSelfCheck: false,
				},
			],
			[
				{
					id: '1',
					contentKind: 'symbol',
					symbolId: 'ru-zh',
					text: 'Ж',
					requiredSymbolIds: ['ru-zh'],
					optionSymbolIds: [],
				},
				{
					id: '2',
					contentKind: 'symbol',
					symbolId: 'ru-zh',
					text: 'Ж',
					requiredSymbolIds: ['ru-zh'],
					optionSymbolIds: [],
				},
				{
					id: '3',
					contentKind: 'symbol',
					symbolId: 'ru-a',
					text: 'А',
					requiredSymbolIds: ['ru-a'],
					optionSymbolIds: [],
				},
			],
		)
		expect(result.correct).toBe(1)
		expect(result.total).toBe(3)
		expect(result.accuracyPercent).toBe(33)
		expect(result.averageResponseTimeMs).toBe(733)
		expect(result.confusionPairs[0]).toEqual({
			expectedSymbolId: 'ru-zh',
			answerSymbolId: 'ru-f',
			count: 2,
		})
		expect(result.characterCorrect).toBe(1)
		expect(result.characterTotal).toBe(3)
		expect(result.wrongItems).toHaveLength(2)
	})
})
