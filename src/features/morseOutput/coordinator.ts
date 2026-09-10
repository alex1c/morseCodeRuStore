/**
 * MorseOutputController — one active mode at a time (audio / vibration / flashlight).
 * All modes share canonical domain timelines.
 */

import { AppState, type AppStateStatus } from 'react-native'

import {
	buildTimelineForCode,
	buildTimelineForText,
	createTimingModel,
	type MorseTimeline,
} from '@/src/domain/morse'
import { createSymbolPlaybackController } from '@/src/features/playback'
import {
	timelineToBinaryPulses,
	timelineToVibrationPattern,
} from './pattern'
import { getTorchDriver } from './torchDriver'
import { getVibrationActuator } from './vibrationActuator'
import {
	FLASHLIGHT_MAX_WPM,
	TOOL_PLAYBACK_MAX_CHARS,
	type MorseOutputMode,
	type MorseOutputRequest,
	type MorseOutputResult,
} from './types'

function truncateForPlayback (text: string): {
	text: string
	truncated: boolean
} {
	const compact = text.replace(/\s+/g, ' ').trim()
	if (compact.length <= TOOL_PLAYBACK_MAX_CHARS) {
		return { text: compact, truncated: false }
	}
	return {
		text: compact.slice(0, TOOL_PLAYBACK_MAX_CHARS),
		truncated: true,
	}
}

function resolveTimeline (request: MorseOutputRequest): {
	timeline: MorseTimeline
	playText: string | null
	warning?: string
} {
	const timing = createTimingModel({
		characterWpm: request.timing.characterWpm,
		farnsworthMultiplier: request.timing.farnsworthMultiplier,
	})
	if (request.code) {
		return {
			timeline: buildTimelineForCode(request.code, timing),
			playText: null,
		}
	}
	if (!request.text || !request.alphabet) {
		throw new Error('MorseOutputRequest requires text+alphabet or code')
	}
	const { text, truncated } = truncateForPlayback(request.text)
	return {
		timeline: buildTimelineForText(text, {
			alphabet: request.alphabet,
			characterWpm: request.timing.characterWpm,
			farnsworthMultiplier: request.timing.farnsworthMultiplier,
		}),
		playText: text,
		warning: truncated
			? `Воспроизведение ограничено ${TOOL_PLAYBACK_MAX_CHARS} символами.`
			: undefined,
	}
}

export type MorseOutputController = {
	play: (request: MorseOutputRequest) => Promise<MorseOutputResult>
	stop: () => Promise<void>
	isPlaying: () => boolean
	activeMode: () => MorseOutputMode | null
	dispose: () => void
}

/**
 * Create a shared output coordinator (one instance for tools UI).
 */
export function createMorseOutputController (): MorseOutputController {
	const audio = createSymbolPlaybackController()
	let generation = 0
	let active: MorseOutputMode | null = null
	const flashTimers: number[] = []
	let appSub: { remove: () => void } | null = null

	const clearFlashTimers = () => {
		flashTimers.forEach((id) => clearTimeout(id))
		flashTimers.length = 0
	}

	const ensureAppGuard = () => {
		if (appSub) {
			return
		}
		appSub = AppState.addEventListener(
			'change',
			(state: AppStateStatus) => {
				if (state !== 'active') {
					void stopInternal()
				}
			},
		)
	}

	const stopInternal = async () => {
		generation += 1
		clearFlashTimers()
		getVibrationActuator().cancel()
		await audio.stop()
		const torch = getTorchDriver()
		if (torch) {
			try {
				await torch.setTorch(false)
				await torch.release()
			} catch {
				// Always attempt release; swallow driver errors on stop.
			}
		}
		active = null
	}

	const playAudio = async (
		request: MorseOutputRequest,
		gen: number,
	): Promise<MorseOutputResult> => {
		active = 'audio'
		request.onProgress?.({ playing: true, mode: 'audio' })
		let result: MorseOutputResult
		if (request.code) {
			result = await audio.playCode(
				request.code,
				request.timing,
			)
		} else if (request.text && request.alphabet) {
			const { text } = truncateForPlayback(request.text)
			result = await audio.playText(
				text,
				request.alphabet,
				request.timing,
				request.onActiveCharacterIndex,
			)
		} else {
			result = { ok: false, error: 'Нет данных для воспроизведения.' }
		}
		if (generation !== gen) {
			return { ok: true }
		}
		active = null
		request.onProgress?.({ playing: false, mode: 'audio' })
		return result
	}

	const playVibration = async (
		request: MorseOutputRequest,
		gen: number,
	): Promise<MorseOutputResult> => {
		const { timeline } = resolveTimeline(request)
		const pattern = timelineToVibrationPattern(timeline)
		if (pattern.length < 2) {
			return { ok: false, error: 'Пустой сигнал.' }
		}
		active = 'vibration'
		request.onProgress?.({ playing: true, mode: 'vibration' })
		getVibrationActuator().vibrate(pattern)
		const total = timeline.totalDurationMs
		await new Promise<void>((resolve) => {
			const id = setTimeout(() => resolve(), total) as unknown as number
			flashTimers.push(id)
		})
		if (generation !== gen) {
			return { ok: true }
		}
		getVibrationActuator().cancel()
		active = null
		request.onProgress?.({ playing: false, mode: 'vibration' })
		return { ok: true }
	}

	const playFlashlight = async (
		request: MorseOutputRequest,
		gen: number,
	): Promise<MorseOutputResult> => {
		const wpm = Math.min(
			request.timing.characterWpm,
			FLASHLIGHT_MAX_WPM,
		)
		const adjusted: MorseOutputRequest = {
			...request,
			timing: { ...request.timing, characterWpm: wpm },
		}
		const { timeline } = resolveTimeline(adjusted)
		const torch = getTorchDriver()
		if (!torch) {
			return {
				ok: false,
				error:
					'Фонарик недоступен на этом устройстве. Нужна камера с вспышкой.',
			}
		}
		const prepared = await torch.prepare()
		if (!prepared.ok) {
			return { ok: false, error: prepared.error }
		}
		active = 'flashlight'
		request.onProgress?.({ playing: true, mode: 'flashlight' })
		const pulses = timelineToBinaryPulses(timeline)
		await new Promise<void>((resolve) => {
			for (const pulse of pulses) {
				const id = setTimeout(() => {
					if (generation !== gen) {
						return
					}
					void torch.setTorch(pulse.on)
				}, pulse.atMs) as unknown as number
				flashTimers.push(id)
			}
			const doneId = setTimeout(() => {
				resolve()
			}, timeline.totalDurationMs + 20) as unknown as number
			flashTimers.push(doneId)
		})
		if (generation !== gen) {
			return { ok: true }
		}
		try {
			await torch.setTorch(false)
			await torch.release()
		} catch {
			// ignore
		}
		active = null
		request.onProgress?.({ playing: false, mode: 'flashlight' })
		return { ok: true }
	}

	ensureAppGuard()

	return {
		async play (request) {
			await stopInternal()
			const gen = generation
			try {
				if (request.mode === 'audio') {
					return await playAudio(request, gen)
				}
				if (request.mode === 'vibration') {
					return await playVibration(request, gen)
				}
				return await playFlashlight(request, gen)
			} catch {
				await stopInternal()
				return {
					ok: false,
					error: 'Не удалось воспроизвести сигнал.',
				}
			}
		},
		async stop () {
			await stopInternal()
		},
		isPlaying: () => active != null || audio.isPlaying(),
		activeMode: () => active,
		dispose () {
			void stopInternal()
			appSub?.remove()
			appSub = null
		},
	}
}

/** Shared singleton for Translator / Reference tools. */
let shared: MorseOutputController | null = null

export function getSharedMorseOutputController (): MorseOutputController {
	if (!shared) {
		shared = createMorseOutputController()
	}
	return shared
}

export function resetSharedMorseOutputControllerForTests (): void {
	shared?.dispose()
	shared = null
}
