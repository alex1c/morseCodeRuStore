/**
 * Morse audio service contract.
 * Timing/catalog stay in domain — this layer only plays a prepared timeline.
 */

import type {
	AlphabetContext,
	MorseElement,
	MorseTimeline,
	TimelineEvent,
} from '@/src/domain/morse'

export type MorseAudioPlayOptions = {
	frequencyHz: number
	characterWpm: number
	farnsworthMultiplier?: number
	alphabet?: AlphabetContext
}

export type MorseAudioService = {
	/** Stop current playback and clear scheduled work. */
	stop: () => Promise<void>
	/** Play a single Morse code (replaces any active playback). */
	playCode: (
		code: MorseElement[],
		options: MorseAudioPlayOptions,
	) => Promise<void>
	/** Play plain text via domain encode + timeline (replaces active playback). */
	playText: (
		text: string,
		options: MorseAudioPlayOptions & { alphabet: AlphabetContext },
	) => Promise<void>
	/** Play an already-built timeline (replaces active playback). */
	playTimeline: (
		timeline: MorseTimeline,
		options: Pick<MorseAudioPlayOptions, 'frequencyHz'>,
	) => Promise<void>
	/** Start continuous sidetone for straight-key hold (stops playback first). */
	startTone: (frequencyHz: number) => Promise<void>
	/** Stop continuous sidetone without affecting future playback generation. */
	stopTone: () => Promise<void>
	/** Whether a playback session is currently active. */
	isPlaying: () => boolean
}

export type { TimelineEvent }
