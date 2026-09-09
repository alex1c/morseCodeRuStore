/**
 * Shared playback highlight scheduling from canonical timeline.
 */

import { scheduleHighlightsFromTimeline } from '@/src/features/playback'

describe('symbol playback orchestration', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})
	afterEach(() => {
		jest.useRealTimers()
	})

	test('highlight indices follow tone events for A (dot+dash)', () => {
		const seen: number[] = []
		const timers: number[] = []
		scheduleHighlightsFromTimeline(
			['dot', 'dash'],
			{
				characterWpm: 20,
				farnsworthMultiplier: 1,
				frequencyHz: 600,
			},
			(index) => {
				seen.push(index)
			},
			timers,
		)
		expect(timers.length).toBe(2)
		jest.runAllTimers()
		expect(seen).toEqual([0, 1])
	})
})
