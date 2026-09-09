/**
 * Timing, WPM, Farnsworth, and timeline gap rules.
 */

import {
	TIMING_UNITS,
	buildTimelineForCode,
	buildTimelineForText,
	createTimingModel,
	durationMsFromUnits,
	unitMsFromWpm,
} from '@/src/domain/morse'

describe('international Morse timing constants', () => {
	test('uses standard unit ratios', () => {
		expect(TIMING_UNITS.dot).toBe(1)
		expect(TIMING_UNITS.dash).toBe(3)
		expect(TIMING_UNITS.intraSymbolGap).toBe(1)
		expect(TIMING_UNITS.letterGap).toBe(3)
		expect(TIMING_UNITS.wordGap).toBe(7)
	})
})

describe('WPM / PARIS unitMs', () => {
	test.each([
		[20, 60],
		[15, 80],
		[12, 100],
		[10, 120],
	] as const)('%i WPM → %i ms unit', (wpm, expected) => {
		expect(unitMsFromWpm(wpm)).toBe(expected)
		expect(createTimingModel({ characterWpm: wpm }).unitMs).toBe(expected)
	})
})

describe('timeline durations', () => {
	const timing = createTimingModel({ characterWpm: 20, farnsworthMultiplier: 1 })

	test('E is a single dot', () => {
		const timeline = buildTimelineForText('E', {
			alphabet: 'LATIN',
			characterWpm: 20,
		})
		expect(timeline.events).toEqual([
			{ type: 'tone', durationMs: 60, element: 'dot' },
		])
		expect(timeline.totalDurationMs).toBe(60)
	})

	test('T is a single dash', () => {
		const timeline = buildTimelineForText('T', {
			alphabet: 'LATIN',
			characterWpm: 20,
		})
		expect(timeline.events).toEqual([
			{ type: 'tone', durationMs: 180, element: 'dash' },
		])
	})

	test('A is dot + intra + dash without trailing intra', () => {
		const timeline = buildTimelineForCode(
			['dot', 'dash'],
			timing,
		)
		expect(timeline.events).toEqual([
			{ type: 'tone', durationMs: 60, element: 'dot' },
			{ type: 'silence', durationMs: 60, reason: 'intra' },
			{ type: 'tone', durationMs: 180, element: 'dash' },
		])
		expect(timeline.totalDurationMs).toBe(300)
	})

	test('two letters use exactly one letter gap of 3 units (no double-gap)', () => {
		const timeline = buildTimelineForText('ET', {
			alphabet: 'LATIN',
			characterWpm: 20,
		})
		expect(timeline.events).toEqual([
			{ type: 'tone', durationMs: 60, element: 'dot' },
			{ type: 'silence', durationMs: 180, reason: 'letter' },
			{ type: 'tone', durationMs: 180, element: 'dash' },
		])
		const silences = timeline.events.filter((e) => e.type === 'silence')
		expect(silences).toHaveLength(1)
		expect(silences[0]).toMatchObject({ reason: 'letter', durationMs: 180 })
	})

	test('two words use exactly one word gap of 7 units', () => {
		const timeline = buildTimelineForText('E T', {
			alphabet: 'LATIN',
			characterWpm: 20,
		})
		expect(timeline.events).toEqual([
			{ type: 'tone', durationMs: 60, element: 'dot' },
			{ type: 'silence', durationMs: 420, reason: 'word' },
			{ type: 'tone', durationMs: 180, element: 'dash' },
		])
	})
})

describe('Farnsworth', () => {
	test('does not stretch dot/dash/intra; stretches letter/word gaps', () => {
		const base = createTimingModel({
			characterWpm: 20,
			farnsworthMultiplier: 1,
		})
		const slow = createTimingModel({
			characterWpm: 20,
			farnsworthMultiplier: 2,
		})
		expect(slow.dotMs).toBe(base.dotMs)
		expect(slow.dashMs).toBe(base.dashMs)
		expect(slow.intraGapMs).toBe(base.intraGapMs)
		expect(slow.letterGapMs).toBe(base.letterGapMs * 2)
		expect(slow.wordGapMs).toBe(base.wordGapMs * 2)

		const timeline = buildTimelineForText('ET', {
			alphabet: 'LATIN',
			characterWpm: 20,
			farnsworthMultiplier: 2,
		})
		const letterGap = timeline.events.find(
			(e) => e.type === 'silence' && e.reason === 'letter',
		)
		expect(letterGap?.durationMs).toBe(360)
		expect(
			timeline.events.find((e) => e.type === 'tone' && e.element === 'dot')
				?.durationMs,
		).toBe(60)
	})
})

describe('duration rounding', () => {
	test('centralizes Math.round for fractional unitMs', () => {
		// 18 WPM → 66.666... ms unit
		expect(durationMsFromUnits(1, unitMsFromWpm(18))).toBe(67)
		expect(durationMsFromUnits(3, unitMsFromWpm(18))).toBe(200)
		const model = createTimingModel({ characterWpm: 18 })
		expect(model.dotMs).toBe(67)
		expect(model.dashMs).toBe(200)
	})
})
