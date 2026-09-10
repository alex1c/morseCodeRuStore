/**
 * Streak rules with injectable "today".
 */

import {
	applyDailyCompletion,
	computeStreakState,
	emptyDailyState,
} from '@/src/domain/daily'

describe('daily streak', () => {
	test('first completion → current 1', () => {
		const streak = computeStreakState(['2026-09-10'], '2026-09-10')
		expect(streak.current).toBe(1)
		expect(streak.best).toBe(1)
		expect(streak.completedToday).toBe(true)
		expect(streak.status).toBe('active')
	})

	test('same-day second completion does not increase streak', () => {
		let state = emptyDailyState()
		state = applyDailyCompletion(state, {
			dateKey: '2026-09-10',
			completedAt: '2026-09-10T10:00:00.000Z',
			itemsCorrect: 40,
			itemsTotal: 48,
			characterAccuracyPercent: 90,
			durationMs: 300000,
		})
		state = applyDailyCompletion(state, {
			dateKey: '2026-09-10',
			completedAt: '2026-09-10T20:00:00.000Z',
			itemsCorrect: 45,
			itemsTotal: 48,
			characterAccuracyPercent: 95,
			durationMs: 280000,
		})
		expect(
			state.completedDates.filter((d) => d === '2026-09-10'),
		).toHaveLength(1)
		const streak = computeStreakState(state.completedDates, '2026-09-10')
		expect(streak.current).toBe(1)
	})

	test('yesterday + today → 2', () => {
		const streak = computeStreakState(
			['2026-09-09', '2026-09-10'],
			'2026-09-10',
		)
		expect(streak.current).toBe(2)
		expect(streak.status).toBe('active')
	})

	test('five consecutive days', () => {
		const dates = [
			'2026-09-06',
			'2026-09-07',
			'2026-09-08',
			'2026-09-09',
			'2026-09-10',
		]
		const streak = computeStreakState(dates, '2026-09-10')
		expect(streak.current).toBe(5)
		expect(streak.best).toBe(5)
	})

	test('missed yesterday → reset when viewing today without completion', () => {
		const streak = computeStreakState(['2026-09-08'], '2026-09-10')
		expect(streak.current).toBe(0)
		expect(streak.status).toBe('broken')
		expect(streak.completedToday).toBe(false)
	})

	test('completed yesterday but not yet today → streak still active (at-risk)', () => {
		const streak = computeStreakState(['2026-09-09'], '2026-09-10')
		expect(streak.current).toBe(1)
		expect(streak.status).toBe('at-risk')
		expect(streak.completedToday).toBe(false)
	})

	test('month boundary streak continues', () => {
		const streak = computeStreakState(
			['2026-08-31', '2026-09-01'],
			'2026-09-01',
		)
		expect(streak.current).toBe(2)
	})

	test('year boundary streak continues', () => {
		const streak = computeStreakState(
			['2025-12-31', '2026-01-01'],
			'2026-01-01',
		)
		expect(streak.current).toBe(2)
	})

	test('best streak survives a break', () => {
		const dates = [
			'2026-09-01',
			'2026-09-02',
			'2026-09-03',
			'2026-09-10',
		]
		const streak = computeStreakState(dates, '2026-09-10')
		expect(streak.current).toBe(1)
		expect(streak.best).toBe(3)
	})
})
