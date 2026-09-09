/**
 * Shared Morse symbol playback + visual highlight orchestration.
 * Uses canonical domain timeline — no duplicate timing math in UI.
 */

import {
	buildTimelineForCode,
	createTimingModel,
	getSymbolById,
	type MorseElement,
} from '@/src/domain/morse'
import { createAudioGate } from '@/src/features/learning/audioGate'
import { getMorseAudioService } from '@/src/features/morseAudio'

export type PlaybackTimingOptions = {
	characterWpm: number
	farnsworthMultiplier: number
	frequencyHz: number
}

export type SymbolPlaybackController = {
	playSymbol: (
		symbolId: string,
		options: PlaybackTimingOptions,
		onActiveElement?: (index: number) => void,
	) => Promise<{ ok: true } | { ok: false; error: string }>
	playCode: (
		code: MorseElement[],
		options: PlaybackTimingOptions,
		onActiveElement?: (index: number) => void,
	) => Promise<{ ok: true } | { ok: false; error: string }>
	stop: () => Promise<void>
	isPlaying: () => boolean
}

/**
 * Schedule highlight callbacks from canonical tone events in the timeline.
 */
export function scheduleHighlightsFromTimeline (
	code: MorseElement[],
	options: PlaybackTimingOptions,
	onActiveElement: (index: number) => void,
	timers: number[],
): void {
	const timing = createTimingModel({
		characterWpm: options.characterWpm,
		farnsworthMultiplier: options.farnsworthMultiplier,
	})
	const timeline = buildTimelineForCode(code, timing)
	let elapsed = 0
	let toneIndex = 0
	for (const event of timeline.events) {
		if (event.type === 'tone') {
			const index = toneIndex
			const id = setTimeout(() => {
				onActiveElement(index)
			}, elapsed) as unknown as number
			timers.push(id)
			toneIndex += 1
		}
		elapsed += event.durationMs
	}
}

export function createSymbolPlaybackController (): SymbolPlaybackController {
	const gate = createAudioGate({
		stop: async () => {
			await getMorseAudioService().stop()
		},
	})
	const timers: number[] = []
	let playing = false

	const clearTimers = () => {
		timers.forEach((id) => clearTimeout(id))
		timers.length = 0
	}

	const stop = async () => {
		clearTimers()
		playing = false
		await gate.stop()
	}

	const playCode = async (
		code: MorseElement[],
		options: PlaybackTimingOptions,
		onActiveElement?: (index: number) => void,
	) => {
		clearTimers()
		onActiveElement?.(-1)
		if (onActiveElement) {
			scheduleHighlightsFromTimeline(
				code,
				options,
				onActiveElement,
				timers,
			)
		}
		playing = true
		try {
			await gate.playReplacing(async () => {
				await getMorseAudioService().playCode(code, {
					characterWpm: options.characterWpm,
					farnsworthMultiplier: options.farnsworthMultiplier,
					frequencyHz: options.frequencyHz,
				})
			})
			onActiveElement?.(-1)
			return { ok: true as const }
		} catch {
			onActiveElement?.(-1)
			return {
				ok: false as const,
				error: 'Не удалось воспроизвести сигнал. Попробуйте ещё раз.',
			}
		} finally {
			playing = false
			clearTimers()
		}
	}

	return {
		stop,
		isPlaying: () => playing,
		playCode,
		async playSymbol (symbolId, options, onActiveElement) {
			const symbol = getSymbolById(symbolId)
			if (!symbol) {
				return {
					ok: false as const,
					error: 'Символ не найден.',
				}
			}
			return playCode(symbol.code, options, onActiveElement)
		},
	}
}
