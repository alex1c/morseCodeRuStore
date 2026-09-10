/**
 * Vibration / flashlight pattern builders from canonical timeline.
 */

import { buildTimelineForText } from '@/src/domain/morse'
import {
	timelineToBinaryPulses,
	timelineToVibrationPattern,
	VIBRATION_MIN_TONE_MS,
} from '@/src/features/morseOutput'

describe('morse output patterns', () => {
	test('vibration pattern preserves tone/silence alternation', () => {
		const timeline = buildTimelineForText('ET', {
			alphabet: 'LATIN',
			characterWpm: 20,
			farnsworthMultiplier: 1,
		})
		const pattern = timelineToVibrationPattern(timeline)
		expect(pattern[0]).toBe(0)
		expect(pattern.length).toBeGreaterThan(2)
		expect(pattern[1]).toBeGreaterThanOrEqual(VIBRATION_MIN_TONE_MS)
	})

	test('Farnsworth stretches total duration not first tone', () => {
		const tight = buildTimelineForText('ET', {
			alphabet: 'LATIN',
			characterWpm: 15,
			farnsworthMultiplier: 1,
		})
		const wide = buildTimelineForText('ET', {
			alphabet: 'LATIN',
			characterWpm: 15,
			farnsworthMultiplier: 3,
		})
		const pTight = timelineToVibrationPattern(tight)
		const pWide = timelineToVibrationPattern(wide)
		expect(pTight[1]).toBe(pWide[1])
		expect(wide.totalDurationMs).toBeGreaterThan(tight.totalDurationMs)
	})

	test('binary flashlight pulses end OFF', () => {
		const timeline = buildTimelineForText('T', {
			alphabet: 'LATIN',
			characterWpm: 12,
			farnsworthMultiplier: 1,
		})
		const pulses = timelineToBinaryPulses(timeline)
		expect(pulses.some((p) => p.on)).toBe(true)
		expect(pulses[pulses.length - 1].on).toBe(false)
	})

	test('min tone clamp applies on high WPM dots', () => {
		const timeline = buildTimelineForText('E', {
			alphabet: 'LATIN',
			characterWpm: 40,
			farnsworthMultiplier: 1,
		})
		const pattern = timelineToVibrationPattern(timeline, 30)
		expect(pattern[1]).toBeGreaterThanOrEqual(30)
	})
})
