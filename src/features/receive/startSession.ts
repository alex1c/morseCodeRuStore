/**
 * Helpers to build ReceiveSession navigation params from adaptive plans.
 */

import {
	DEFAULT_FOCUSED_SESSION_LENGTH,
	PAIR_COOLDOWN_N,
	DEFAULT_COOLDOWN_N,
	type AdaptiveWeightMap,
} from '@/src/domain/adaptive'
import { DEFAULT_RECEIVE_SETTINGS } from './constants'
import type { ReceiveAlphabet, ReceiveSettings } from './types'
import { wallTimeMs } from '@/src/utils/clock'

export type ReceiveSessionLaunch = {
	settings: ReceiveSettings
	symbolPool: string[]
	seed: number
	weights?: AdaptiveWeightMap
	cooldownN?: number
}

export function buildReceiveLaunch (input: {
	alphabet: ReceiveAlphabet
	symbolPool: string[]
	weights?: AdaptiveWeightMap
	cooldownN?: number
	sessionLength?: ReceiveSettings['sessionLength']
	answerMode?: ReceiveSettings['answerMode']
	baseSettings?: Partial<ReceiveSettings>
}): ReceiveSessionLaunch {
	// Preserve contentKind (and other Phase 7 fields) from defaults / baseSettings.
	// Quick Practice callers rely on DEFAULT contentKind: 'symbol'.
	const settings: ReceiveSettings = {
		...DEFAULT_RECEIVE_SETTINGS,
		...(input.baseSettings ?? {}),
		alphabet: input.alphabet,
		symbolPreset: input.baseSettings?.symbolPreset ?? 'custom',
		customSymbolIds: input.symbolPool,
		sessionLength: input.sessionLength ?? DEFAULT_FOCUSED_SESSION_LENGTH,
		answerMode: input.answerMode ?? 'choices',
		contentKind: input.baseSettings?.contentKind ?? 'symbol',
	}
	return {
		settings,
		symbolPool: input.symbolPool,
		seed: wallTimeMs() % 1_000_000,
		weights: input.weights,
		cooldownN: input.cooldownN,
	}
}

export function pairLaunchCooldown (): number {
	return PAIR_COOLDOWN_N
}

export function adaptiveLaunchCooldown (): number {
	return DEFAULT_COOLDOWN_N
}
