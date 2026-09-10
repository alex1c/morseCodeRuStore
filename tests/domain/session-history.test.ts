/**
 * Session history append / prune / dedupe.
 */

import {
	SESSION_HISTORY_MAX,
	appendSessionSummary,
	emptySessionHistory,
	latestSessions,
	sessionsInDateRange,
	type SessionSummary,
} from '@/src/domain/session-history'

function makeSession (
	partial: Partial<SessionSummary> & Pick<SessionSummary, 'id' | 'localDate'>,
): SessionSummary {
	return {
		finishedAt: `${partial.localDate}T12:00:00.000Z`,
		source: 'receive',
		alphabet: 'RU',
		contentKind: 'symbol',
		itemCount: 10,
		correctItems: 8,
		itemAccuracyPercent: 80,
		characterCorrect: 8,
		characterTotal: 10,
		characterAccuracyPercent: 80,
		durationMs: 60_000,
		averageResponseTimeMs: 900,
		lessonId: null,
		courseId: null,
		transmitTimingQuality: null,
		...partial,
	}
}

describe('session history', () => {
	test('append newest first and dedupe by id', () => {
		let state = emptySessionHistory()
		state = appendSessionSummary(
			state,
			makeSession({ id: 'a', localDate: '2026-09-10' }),
		)
		state = appendSessionSummary(
			state,
			makeSession({ id: 'b', localDate: '2026-09-10' }),
		)
		state = appendSessionSummary(
			state,
			makeSession({ id: 'a', localDate: '2026-09-10' }),
		)
		expect(state.sessions.map((s) => s.id)).toEqual(['b', 'a'])
	})

	test('prunes to max', () => {
		let state = emptySessionHistory()
		for (let i = 0; i < SESSION_HISTORY_MAX + 20; i += 1) {
			state = appendSessionSummary(
				state,
				makeSession({
					id: `s-${i}`,
					localDate: '2026-09-10',
				}),
				SESSION_HISTORY_MAX,
			)
		}
		expect(state.sessions).toHaveLength(SESSION_HISTORY_MAX)
		expect(state.sessions[0].id).toBe(`s-${SESSION_HISTORY_MAX + 19}`)
	})

	test('date range filter and latest', () => {
		const sessions = [
			makeSession({ id: '1', localDate: '2026-09-10', source: 'daily' }),
			makeSession({ id: '2', localDate: '2026-09-08', source: 'transmit' }),
			makeSession({ id: '3', localDate: '2026-09-01', source: 'lesson' }),
		]
		expect(
			sessionsInDateRange(sessions, '2026-09-08', '2026-09-10').map(
				(s) => s.id,
			),
		).toEqual(['1', '2'])
		expect(latestSessions(sessions, 2).map((s) => s.id)).toEqual([
			'1',
			'2',
		])
	})
})
