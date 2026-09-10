/**
 * Local calendar date keys — must not use UTC slice.
 */

import {
	addLocalDays,
	diffLocalDays,
	localWeekdayIndex,
	parseLocalDateKey,
	resetDayClockForTests,
	setDayClockForTests,
	toLocalDateKey,
} from '@/src/domain/daily'

describe('daily local dates', () => {
	afterEach(() => {
		resetDayClockForTests()
	})

	test('toLocalDateKey uses local calendar components', () => {
		// Fixed instant: inject via Date constructed in local TZ
		const local = new Date(2026, 2, 15, 23, 30, 0) // Mar 15 local
		setDayClockForTests({ nowMs: () => local.getTime() })
		expect(toLocalDateKey()).toBe('2026-03-15')
	})

	test('addLocalDays crosses month and year boundaries', () => {
		expect(addLocalDays('2026-01-31', 1)).toBe('2026-02-01')
		expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01')
		expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29') // leap
		expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28')
	})

	test('diffLocalDays and weekday index', () => {
		expect(diffLocalDays('2026-09-10', '2026-09-09')).toBe(1)
		expect(diffLocalDays('2026-09-09', '2026-09-10')).toBe(-1)
		// 2026-09-10 is Thursday → index 3
		expect(localWeekdayIndex('2026-09-10')).toBe(3)
		expect(parseLocalDateKey('2026-09-10').getDate()).toBe(10)
	})
})
