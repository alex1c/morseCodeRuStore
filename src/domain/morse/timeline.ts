/**
 * Deterministic Morse playback timeline (tone / silence events).
 * Gap rules avoid double-counting intra + letter / word spaces.
 */

import type { EncodedSymbol } from './codec'
import { encodeText } from './codec'
import type { AlphabetContext, MorseElement } from './types'
import {
	createTimingModel,
	type TimingModel,
} from './timing'

export type TimelineEvent =
	| {
			type: 'tone'
			durationMs: number
			element: MorseElement
	  }
	| {
			type: 'silence'
			durationMs: number
			reason: 'intra' | 'letter' | 'word'
	  }

export type MorseTimeline = {
	events: TimelineEvent[]
	totalDurationMs: number
	timing: TimingModel
}

function appendCodeEvents (
	events: TimelineEvent[],
	code: MorseElement[],
	timing: TimingModel,
): void {
	code.forEach((element, index) => {
		events.push({
			type: 'tone',
			durationMs:
				element === 'dot' ? timing.dotMs : timing.dashMs,
			element,
		})
		// Intra-element gap only BETWEEN elements — never after the last.
		if (index < code.length - 1) {
			events.push({
				type: 'silence',
				durationMs: timing.intraGapMs,
				reason: 'intra',
			})
		}
	})
}

/**
 * Build a timeline from structured encode tokens.
 * Between letters: exactly one letter gap (3 units × Farnsworth).
 * Between words: exactly one word gap (7 units × Farnsworth).
 * Never adds trailing letter/word gap after the final symbol.
 */
export function buildTimelineFromTokens (
	tokens: EncodedSymbol[],
	timing: TimingModel,
): MorseTimeline {
	const events: TimelineEvent[] = []
	let pendingGap: 'letter' | 'word' | null = null

	for (const token of tokens) {
		if (token.kind === 'unsupported') {
			continue
		}
		if (token.kind === 'word-space') {
			// Upgrade a pending letter gap to a word gap; do not stack.
			pendingGap = 'word'
			continue
		}

		if (pendingGap === 'word') {
			events.push({
				type: 'silence',
				durationMs: timing.wordGapMs,
				reason: 'word',
			})
		} else if (pendingGap === 'letter') {
			events.push({
				type: 'silence',
				durationMs: timing.letterGapMs,
				reason: 'letter',
			})
		}
		pendingGap = null

		appendCodeEvents(events, token.code, timing)
		// After a letter, remember a letter gap for the next letter (if any).
		pendingGap = 'letter'
	}

	const totalDurationMs = events.reduce(
		(sum, event) => sum + event.durationMs,
		0,
	)

	return { events, totalDurationMs, timing }
}

export type BuildTimelineForTextOptions = {
	alphabet: AlphabetContext
	characterWpm: number
	farnsworthMultiplier?: number
}

/** Convenience: encode text then build timeline. */
export function buildTimelineForText (
	text: string,
	options: BuildTimelineForTextOptions,
): MorseTimeline {
	const timing = createTimingModel({
		characterWpm: options.characterWpm,
		farnsworthMultiplier: options.farnsworthMultiplier,
	})
	const encoded = encodeText(text, options.alphabet)
	return buildTimelineFromTokens(encoded.tokens, timing)
}

/** Build timeline for a single catalog symbol code. */
export function buildTimelineForCode (
	code: MorseElement[],
	timing: TimingModel,
): MorseTimeline {
	const events: TimelineEvent[] = []
	appendCodeEvents(events, code, timing)
	const totalDurationMs = events.reduce(
		(sum, event) => sum + event.durationMs,
		0,
	)
	return { events, totalDurationMs, timing }
}
