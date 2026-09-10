/**
 * Expo Audio Morse player — race-safe sequential timeline playback + live sidetone.
 */

import {
	createAudioPlayer,
	setAudioModeAsync,
	type AudioPlayer,
} from 'expo-audio'

import {
	buildTimelineForCode,
	buildTimelineForText,
	createTimingModel,
	type MorseElement,
	type MorseTimeline,
} from '@/src/domain/morse'
import { cancellableDelay } from './delay'
import type {
	MorseAudioPlayOptions,
	MorseAudioService,
} from './types'
import {
	buildSeamlessToneLoopWavDataUri,
	buildToneWavDataUri,
} from './wavTone'

export function createExpoAudioMorseAudioService (): MorseAudioService {
	let generation = 0
	let playing = false
	let activeSound: AudioPlayer | null = null
	let liveToneSound: AudioPlayer | null = null
	let liveToneActive = false
	let cancelFlag = { cancelled: false }

	const unloadSound = async () => {
		if (!activeSound) {
			return
		}
		const sound = activeSound
		activeSound = null
		sound.pause()
		sound.remove()
	}

	const unloadLiveTone = async () => {
		liveToneActive = false
		if (!liveToneSound) {
			return
		}
		const sound = liveToneSound
		liveToneSound = null
		sound.pause()
		sound.remove()
	}

	const stop = async () => {
		generation += 1
		cancelFlag.cancelled = true
		playing = false
		await unloadLiveTone()
		await unloadSound()
	}

	const playTimeline = async (
		timeline: MorseTimeline,
		options: Pick<MorseAudioPlayOptions, 'frequencyHz'>,
	) => {
		await stop()
		const myGeneration = generation
		cancelFlag = { cancelled: false }
		playing = true

		try {
			await setAudioModeAsync({
				playsInSilentMode: true,
				allowsRecording: false,
				shouldPlayInBackground: false,
				interruptionMode: 'duckOthers',
				shouldRouteThroughEarpiece: false,
			})
		} catch {
			// Audio mode is best-effort on all platforms.
		}

		try {
			for (const event of timeline.events) {
				if (cancelFlag.cancelled || myGeneration !== generation) {
					break
				}
				if (event.type === 'silence') {
					await cancellableDelay(event.durationMs, cancelFlag)
					continue
				}

				const uri = buildToneWavDataUri(
					options.frequencyHz,
					event.durationMs,
				)
				const sound = createAudioPlayer(uri, { keepAudioSessionActive: false })
				sound.volume = 1
				sound.play()
				if (cancelFlag.cancelled || myGeneration !== generation) {
					sound.pause()
					sound.remove()
					break
				}
				activeSound = sound
				await cancellableDelay(event.durationMs, cancelFlag)
				await unloadSound()
			}
		} finally {
			if (myGeneration === generation) {
				playing = false
			}
			await unloadSound()
		}
	}

	const startTone = async (frequencyHz: number) => {
		// Stop any sequence playback before live key tone.
		await stop()
		const myGeneration = generation
		try {
			await setAudioModeAsync({
				playsInSilentMode: true,
				allowsRecording: false,
				shouldPlayInBackground: false,
				interruptionMode: 'duckOthers',
				shouldRouteThroughEarpiece: false,
			})
		} catch {
			// best-effort
		}
		if (myGeneration !== generation) {
			return
		}
		const uri = buildSeamlessToneLoopWavDataUri(frequencyHz)
		const sound = createAudioPlayer(uri, { keepAudioSessionActive: false })
		sound.loop = true
		sound.volume = 1
		sound.play()
		if (myGeneration !== generation) {
			sound.pause()
			sound.remove()
			return
		}
		liveToneSound = sound
		liveToneActive = true
		playing = true
	}

	const stopTone = async () => {
		await unloadLiveTone()
		if (!activeSound) {
			playing = false
		}
	}

	return {
		stop,
		isPlaying: () => playing || liveToneActive,
		playTimeline,
		startTone,
		stopTone,
		async playCode (code: MorseElement[], options) {
			const timing = createTimingModel({
				characterWpm: options.characterWpm,
				farnsworthMultiplier: options.farnsworthMultiplier,
			})
			const timeline = buildTimelineForCode(code, timing)
			await playTimeline(timeline, options)
		},
		async playText (text, options) {
			const timeline = buildTimelineForText(text, {
				alphabet: options.alphabet,
				characterWpm: options.characterWpm,
				farnsworthMultiplier: options.farnsworthMultiplier,
			})
			await playTimeline(timeline, options)
		},
	}
}

/** Backward-compatible factory name for existing callers. */
export const createExpoAvMorseAudioService = createExpoAudioMorseAudioService

/** Shared app singleton — screens import this, not raw expo-audio. */
let singleton: MorseAudioService | null = null

export function getMorseAudioService (): MorseAudioService {
	if (!singleton) {
		singleton = createExpoAudioMorseAudioService()
	}
	return singleton
}

/** Test helper to inject a mock service. */
export function setMorseAudioServiceForTests (
	service: MorseAudioService | null,
): void {
	singleton = service
}
