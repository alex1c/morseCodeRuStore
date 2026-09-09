/**
 * Expo-AV Morse player — race-safe sequential timeline playback.
 */

import { Audio } from 'expo-av'

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
import { buildToneWavDataUri } from './wavTone'

export function createExpoAvMorseAudioService (): MorseAudioService {
	let generation = 0
	let playing = false
	let activeSound: Audio.Sound | null = null
	let cancelFlag = { cancelled: false }

	const unloadSound = async () => {
		if (!activeSound) {
			return
		}
		const sound = activeSound
		activeSound = null
		try {
			await sound.stopAsync()
		} catch {
			// ignore
		}
		try {
			await sound.unloadAsync()
		} catch {
			// ignore
		}
	}

	const stop = async () => {
		generation += 1
		cancelFlag.cancelled = true
		playing = false
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
			await Audio.setAudioModeAsync({
				playsInSilentModeIOS: true,
				allowsRecordingIOS: false,
				staysActiveInBackground: false,
				shouldDuckAndroid: true,
				playThroughEarpieceAndroid: false,
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
				const { sound } = await Audio.Sound.createAsync(
					{ uri },
					{ shouldPlay: true, volume: 1 },
				)
				if (cancelFlag.cancelled || myGeneration !== generation) {
					await sound.unloadAsync()
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

	return {
		stop,
		isPlaying: () => playing,
		playTimeline,
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

/** Shared app singleton — screens import this, not raw expo-av. */
let singleton: MorseAudioService | null = null

export function getMorseAudioService (): MorseAudioService {
	if (!singleton) {
		singleton = createExpoAvMorseAudioService()
	}
	return singleton
}

/** Test helper to inject a mock service. */
export function setMorseAudioServiceForTests (
	service: MorseAudioService | null,
): void {
	singleton = service
}
