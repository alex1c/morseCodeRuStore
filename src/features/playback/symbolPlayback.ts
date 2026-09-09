/**
 * Shared Morse symbol playback + visual highlight orchestration.
 * Uses canonical domain timeline — no duplicate timing math in UI.
 */

import {
	buildTimelineForCode,
	createTimingModel,
	encodeText,
	getSymbolById,
	type AlphabetContext,
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
	/**
	 * Play multi-character text. Highlight callback uses index into
	 * required (non-space) symbols — first tone of each letter fires it.
	 * Pass -1 when idle / finished.
	 */
	playText: (
		text: string,
		alphabet: AlphabetContext,
		options: PlaybackTimingOptions,
		onActiveCharacterIndex?: (index: number) => void,
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

/**
 * Schedule per-letter highlights from the same encode + timing rules as playText.
 * Callback index counts non-space required symbols only.
 */
export function scheduleCharacterHighlightsFromText (
	text: string,
	alphabet: AlphabetContext,
	options: PlaybackTimingOptions,
	onActiveCharacterIndex: (index: number) => void,
	timers: number[],
): void {
	const timing = createTimingModel({
		characterWpm: options.characterWpm,
		farnsworthMultiplier: options.farnsworthMultiplier,
	})
	const encoded = encodeText(text, alphabet)
	let elapsed = 0
	let pendingGap: 'letter' | 'word' | null = null
	let symbolIndex = 0

	for (const token of encoded.tokens) {
		if (token.kind === 'unsupported') {
			continue
		}
		if (token.kind === 'word-space') {
			pendingGap = 'word'
			continue
		}

		if (pendingGap === 'word') {
			elapsed += timing.wordGapMs
		} else if (pendingGap === 'letter') {
			elapsed += timing.letterGapMs
		}
		pendingGap = null

		// Fire on the first tone of this letter symbol.
		const index = symbolIndex
		const id = setTimeout(() => {
			onActiveCharacterIndex(index)
		}, elapsed) as unknown as number
		timers.push(id)
		symbolIndex += 1

		token.code.forEach((element, elementIndex) => {
			elapsed +=
				element === 'dot' ? timing.dotMs : timing.dashMs
			if (elementIndex < token.code.length - 1) {
				elapsed += timing.intraGapMs
			}
		})
		pendingGap = 'letter'
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

	const playText = async (
		text: string,
		alphabet: AlphabetContext,
		options: PlaybackTimingOptions,
		onActiveCharacterIndex?: (index: number) => void,
	) => {
		clearTimers()
		onActiveCharacterIndex?.(-1)
		if (onActiveCharacterIndex) {
			scheduleCharacterHighlightsFromText(
				text,
				alphabet,
				options,
				onActiveCharacterIndex,
				timers,
			)
		}
		playing = true
		try {
			await gate.playReplacing(async () => {
				await getMorseAudioService().playText(text, {
					alphabet,
					characterWpm: options.characterWpm,
					farnsworthMultiplier: options.farnsworthMultiplier,
					frequencyHz: options.frequencyHz,
				})
			})
			onActiveCharacterIndex?.(-1)
			return { ok: true as const }
		} catch {
			onActiveCharacterIndex?.(-1)
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
		playText,
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
