/**
 * Build Android-style Vibration patterns from a canonical Morse timeline.
 * Pattern format: [delay, vibrate, delay, vibrate, ...]
 */

import type { MorseTimeline } from '@/src/domain/morse'
import { VIBRATION_MIN_TONE_MS } from './types'

/**
 * Convert timeline tone/silence events into an RN Vibration pattern.
 * Tone durations are clamped to a hardware minimum so short dots remain perceptible.
 */
export function timelineToVibrationPattern (
	timeline: MorseTimeline,
	minToneMs = VIBRATION_MIN_TONE_MS,
): number[] {
	const pattern: number[] = [0]
	for (const event of timeline.events) {
		if (event.type === 'tone') {
			pattern.push(Math.max(minToneMs, Math.round(event.durationMs)))
		} else {
			pattern.push(Math.max(0, Math.round(event.durationMs)))
		}
	}
	// Trailing silence alone is fine; if last entry is a lone delay after start, OK.
	if (pattern.length === 1) {
		return []
	}
	return pattern
}

/**
 * Pure schedule of ON/OFF segments for flashlight (or any binary actuator).
 */
export type BinaryPulse = {
	/** Delay from playback start before this action. */
	atMs: number
	on: boolean
}

export function timelineToBinaryPulses (
	timeline: MorseTimeline,
): BinaryPulse[] {
	const pulses: BinaryPulse[] = []
	let elapsed = 0
	for (const event of timeline.events) {
		if (event.type === 'tone') {
			pulses.push({ atMs: elapsed, on: true })
			elapsed += event.durationMs
			pulses.push({ atMs: elapsed, on: false })
		} else {
			elapsed += event.durationMs
		}
	}
	return pulses
}
