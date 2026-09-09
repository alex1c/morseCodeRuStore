/**
 * Navigation route names and param lists for the root stack.
 */

import type {
	ReceiveContentKind,
	ReceiveSessionResult,
	ReceiveSettings,
} from '@/src/features/receive'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import type {
	TransmitSessionResult,
	TransmitSettings,
} from '@/src/features/transmit'

export type RootStackParamList = {
	Onboarding: undefined
	Home: undefined
	Lesson: undefined
	LessonResult: {
		lessonId: string
		courseId: 'ru-main' | 'latin-main'
		correct: number
		total: number
		accuracyPercent: number
		weakSymbolIds: string[]
		passed: boolean
	}
	Receive: undefined
	ReceiveSession: {
		settings: ReceiveSettings
		symbolPool: string[]
		/** Seeded RNG for deterministic question order in tests / session. */
		seed: number
		weights?: AdaptiveWeightMap
		cooldownN?: number
		/** Forced wrong items for «Повторить ошибки». */
		retryItems?: {
			text: string
			contentKind: Exclude<ReceiveContentKind, 'symbol'>
			requiredSymbolIds: string[]
		}[]
	}
	ReceiveResult: {
		result: ReceiveSessionResult
		settings: ReceiveSettings
		symbolPool: string[]
		weights?: AdaptiveWeightMap
	}
	Transmit: undefined
	TransmitSession: {
		settings: TransmitSettings
		symbolPool: string[]
		seed: number
		weights?: Record<string, number>
	}
	TransmitResult: {
		result: TransmitSessionResult
		settings: TransmitSettings
		symbolPool: string[]
	}
	Errors: undefined
	SymbolDetail: {
		symbolId: string
		alphabet: 'RU' | 'LATIN'
	}
	QuickPractice: undefined
	Course: undefined
	Stats: undefined
	Translator: undefined
	Reference: undefined
	Learning: undefined
	Settings: undefined
}
