/**
 * Stats range aggregation — receive vs transmit, no-data days.
 */

import {
	aggregateRange,
	aggregateToday,
	type SessionSummary,
} from '@/src/domain/session-history'

function makeSession (
	partial: Partial<SessionSummary> &
		Pick<SessionSummary, 'id' | 'localDate' | 'source'>,
): SessionSummary {
	return {
		finishedAt: `${partial.localDate}T12:00:00.000Z`,
		alphabet: 'RU',
		contentKind: partial.source === 'transmit' ? null : 'symbol',
		itemCount: 10,
		correctItems: 8,
		itemAccuracyPercent: 80,
		characterCorrect: partial.source === 'transmit' ? null : 8,
		characterTotal: partial.source === 'transmit' ? null : 10,
		characterAccuracyPercent: partial.source === 'transmit' ? null : 80,
		durationMs: 120_000,
		averageResponseTimeMs: 800,
		lessonId: null,
		courseId: null,
		transmitTimingQuality: partial.source === 'transmit' ? 0.85 : null,
		...partial,
	}
}

describe('stats aggregation', () => {
	test('7-day range separates receive and transmit', () => {
		const sessions = [
			makeSession({
				id: 'r1',
				localDate: '2026-09-10',
				source: 'receive',
				characterCorrect: 9,
				characterTotal: 10,
				correctItems: 9,
				itemCount: 10,
			}),
			makeSession({
				id: 't1',
				localDate: '2026-09-10',
				source: 'transmit',
				correctItems: 7,
				itemCount: 10,
			}),
			makeSession({
				id: 'd1',
				localDate: '2026-09-09',
				source: 'daily',
				characterCorrect: 40,
				characterTotal: 50,
				correctItems: 40,
				itemCount: 50,
				durationMs: 300_000,
			}),
		]
		const range = aggregateRange(sessions, 7, '2026-09-10')
		expect(range.totalSessions).toBe(3)
		expect(range.activeDays).toBe(2)
		expect(range.receive.total).toBe(60)
		expect(range.receive.correct).toBe(49)
		expect(range.receive.percent).toBe(Math.round((49 / 60) * 100))
		expect(range.transmit.total).toBe(10)
		expect(range.transmit.percent).toBe(70)
		expect(range.practiceDurationMs).toBe(120_000 + 120_000 + 300_000)
		expect(range.days).toHaveLength(7)
	})

	test('no-data day is not 0% accuracy', () => {
		const sessions = [
			makeSession({
				id: 'r1',
				localDate: '2026-09-10',
				source: 'receive',
			}),
		]
		const range = aggregateRange(sessions, 7, '2026-09-10')
		const emptyDay = range.days.find((d) => d.dateKey === '2026-09-08')
		expect(emptyDay?.hasActivity).toBe(false)
		expect(emptyDay?.receiveCharacterAccuracyPercent).toBeNull()
		expect(emptyDay?.transmitAccuracyPercent).toBeNull()
	})

	test('today aggregate and multi-char character accuracy', () => {
		const sessions = [
			makeSession({
				id: 'w1',
				localDate: '2026-09-10',
				source: 'receive',
				contentKind: 'word',
				itemCount: 10,
				correctItems: 7,
				characterCorrect: 45,
				characterTotal: 50,
				characterAccuracyPercent: 90,
			}),
		]
		const today = aggregateToday(sessions, '2026-09-10')
		expect(today.hasActivity).toBe(true)
		expect(today.receiveCharacterAccuracyPercent).toBe(90)
		expect(today.sessionCount).toBe(1)
	})

	test('empty history → null accuracies', () => {
		const range = aggregateRange([], 30, '2026-09-10')
		expect(range.totalSessions).toBe(0)
		expect(range.activeDays).toBe(0)
		expect(range.receive.percent).toBeNull()
		expect(range.transmit.percent).toBeNull()
		expect(range.days).toHaveLength(30)
	})
})
