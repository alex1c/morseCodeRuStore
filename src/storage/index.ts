/**
 * Local persistence foundation via AsyncStorage.
 * Chosen for Phase 1: preferences + progress JSON is small, versioned,
 * and matches other ForestMusic trainers (e.g. logic games). SQLite can
 * be introduced later if stats volume grows.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_USER_PREFERENCES,
	createEmptySymbolStats,
	type LearningProgress,
	type SelectedAlphabet,
	type SymbolStats,
	type SymbolStatsMap,
	type UserPreferences,
} from '@/src/types'
import {
	applyAttemptToStats,
} from '@/src/domain/morse'
import {
	DEFAULT_RECEIVE_SETTINGS,
	type ReceiveSettings,
} from '@/src/features/receive'
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './keys'

type MetaState = {
	schemaVersion: number
}

let migrated = false
let symbolStatsQueue: Promise<unknown> = Promise.resolve()

/** Test helper — allow re-running migration logic. */
export function resetStorageMigrationFlagForTests (): void {
	migrated = false
	symbolStatsQueue = Promise.resolve()
}

async function readJson<T> (key: string): Promise<T | null> {
	try {
		const raw = await AsyncStorage.getItem(key)
		if (raw == null) {
			return null
		}
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

async function writeJson (key: string, value: unknown): Promise<void> {
	await AsyncStorage.setItem(key, JSON.stringify(value))
}

/**
 * Ensure storage meta is present. Safe to call repeatedly.
 */
export async function ensureStorageMigrated (): Promise<void> {
	if (migrated) {
		return
	}
	const meta = await readJson<MetaState>(STORAGE_KEYS.meta)
	if (meta?.schemaVersion === STORAGE_SCHEMA_VERSION) {
		migrated = true
		return
	}
	if (
		Number.isInteger(meta?.schemaVersion) &&
		meta!.schemaVersion > STORAGE_SCHEMA_VERSION
	) {
		migrated = true
		return
	}
	const previous = meta?.schemaVersion ?? 0
	if (previous < 2) {
		const rawProgress = await readJson<Partial<LearningProgress>>(
			STORAGE_KEYS.progress,
		)
		if (rawProgress) {
			const normalized: LearningProgress = {
				...DEFAULT_LEARNING_PROGRESS,
				...rawProgress,
				currentCourseId:
					rawProgress.currentCourseId ??
					DEFAULT_LEARNING_PROGRESS.currentCourseId,
				completedLessonIds:
					rawProgress.completedLessonIds ??
					DEFAULT_LEARNING_PROGRESS.completedLessonIds,
				bestLessonScorePercentById:
					rawProgress.bestLessonScorePercentById ??
					DEFAULT_LEARNING_PROGRESS.bestLessonScorePercentById,
				unlockedLessonIds:
					rawProgress.unlockedLessonIds ??
					DEFAULT_LEARNING_PROGRESS.unlockedLessonIds,
				knownSymbolIds:
					rawProgress.knownSymbolIds ??
					DEFAULT_LEARNING_PROGRESS.knownSymbolIds,
			}
			await writeJson(STORAGE_KEYS.progress, normalized)
		}
	}
	if (previous < 3) {
		const existing = await readJson<Partial<ReceiveSettings>>(
			STORAGE_KEYS.receiveSettings,
		)
		await writeJson(STORAGE_KEYS.receiveSettings, {
			...DEFAULT_RECEIVE_SETTINGS,
			...(existing ?? {}),
		})
	}
	await writeJson(STORAGE_KEYS.meta, {
		schemaVersion: STORAGE_SCHEMA_VERSION,
	})
	migrated = true
}

/**
 * Load preferences, merging with defaults so new fields appear safely.
 */
export async function getUserPreferences (): Promise<UserPreferences> {
	await ensureStorageMigrated()
	const stored = await readJson<Partial<UserPreferences>>(
		STORAGE_KEYS.preferences,
	)
	if (!stored) {
		return { ...DEFAULT_USER_PREFERENCES }
	}
	return {
		...DEFAULT_USER_PREFERENCES,
		...stored,
	}
}

/**
 * Persist full preferences object (caller merges partial updates).
 */
export async function saveUserPreferences (
	preferences: UserPreferences,
): Promise<void> {
	await ensureStorageMigrated()
	await writeJson(STORAGE_KEYS.preferences, preferences)
}

/**
 * Update a subset of preferences and return the merged result.
 */
export async function updateUserPreferences (
	patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
	const current = await getUserPreferences()
	const next = { ...current, ...patch }
	await saveUserPreferences(next)
	return next
}

/**
 * Persist alphabet choice from onboarding and mark onboarding done.
 */
export async function saveSelectedAlphabet (
	selectedAlphabet: SelectedAlphabet,
): Promise<UserPreferences> {
	return updateUserPreferences({
		selectedAlphabet,
		onboardingCompleted: true,
	})
}

export async function getLearningProgress (): Promise<LearningProgress> {
	await ensureStorageMigrated()
	const stored = await readJson<Partial<LearningProgress>>(
		STORAGE_KEYS.progress,
	)
	if (!stored) {
		return { ...DEFAULT_LEARNING_PROGRESS }
	}
	return {
		...DEFAULT_LEARNING_PROGRESS,
		...stored,
		currentCourseId:
			stored.currentCourseId ??
			DEFAULT_LEARNING_PROGRESS.currentCourseId,
		completedLessonIds:
			stored.completedLessonIds ??
			DEFAULT_LEARNING_PROGRESS.completedLessonIds,
		bestLessonScorePercentById:
			stored.bestLessonScorePercentById ??
			DEFAULT_LEARNING_PROGRESS.bestLessonScorePercentById,
		unlockedLessonIds:
			stored.unlockedLessonIds ??
			DEFAULT_LEARNING_PROGRESS.unlockedLessonIds,
		knownSymbolIds:
			stored.knownSymbolIds ??
			DEFAULT_LEARNING_PROGRESS.knownSymbolIds,
	}
}

export async function saveLearningProgress (
	progress: LearningProgress,
): Promise<void> {
	await ensureStorageMigrated()
	await writeJson(STORAGE_KEYS.progress, progress)
}

export async function updateLearningProgress (
	patch: Partial<LearningProgress>,
): Promise<LearningProgress> {
	const current = await getLearningProgress()
	const next: LearningProgress = {
		...current,
		...patch,
		bestLessonScorePercentById: {
			...current.bestLessonScorePercentById,
			...(patch.bestLessonScorePercentById ?? {}),
		},
	}
	await saveLearningProgress(next)
	return next
}

export async function getSymbolStatsMap (): Promise<SymbolStatsMap> {
	await ensureStorageMigrated()
	const stored = await readJson<SymbolStatsMap>(STORAGE_KEYS.symbolStats)
	return stored ?? {}
}

export async function saveSymbolStatsMap (
	stats: SymbolStatsMap,
): Promise<void> {
	await ensureStorageMigrated()
	await writeJson(STORAGE_KEYS.symbolStats, stats)
}

/**
 * Ensure a SymbolStats row exists for symbolId (returns copy).
 */
export async function getOrCreateSymbolStats (
	symbolId: string,
): Promise<SymbolStats> {
	const map = await getSymbolStatsMap()
	const existing = map[symbolId]
	if (existing) {
		return existing
	}
	const created = createEmptySymbolStats(symbolId)
	map[symbolId] = created
	await saveSymbolStatsMap(map)
	return created
}

/**
 * Serialized SymbolStats update — prevents lost writes under rapid answers.
 */
export async function recordSymbolAttempt (input: {
	expectedSymbolId: string
	isCorrect: boolean
	responseTimeMs: number | null
	answerSymbolId?: string
	practicedAt?: string
}): Promise<SymbolStats> {
	const run = symbolStatsQueue.then(async () => {
		await ensureStorageMigrated()
		const map = await getSymbolStatsMap()
		const previous =
			map[input.expectedSymbolId] ??
			createEmptySymbolStats(input.expectedSymbolId)
		const next = applyAttemptToStats(previous, {
			isCorrect: input.isCorrect,
			responseTimeMs: input.responseTimeMs,
			practicedAt: input.practicedAt ?? new Date().toISOString(),
			answerSymbolId: input.answerSymbolId,
		})
		map[input.expectedSymbolId] = next
		await saveSymbolStatsMap(map)
		return next
	})
	symbolStatsQueue = run.then(
		() => undefined,
		() => undefined,
	)
	return run
}

export async function getReceiveSettings (): Promise<ReceiveSettings> {
	await ensureStorageMigrated()
	const stored = await readJson<Partial<ReceiveSettings>>(
		STORAGE_KEYS.receiveSettings,
	)
	return {
		...DEFAULT_RECEIVE_SETTINGS,
		...(stored ?? {}),
		customSymbolIds: stored?.customSymbolIds ?? [],
	}
}

export async function saveReceiveSettings (
	settings: ReceiveSettings,
): Promise<void> {
	await ensureStorageMigrated()
	await writeJson(STORAGE_KEYS.receiveSettings, settings)
}

/**
 * Clear all Morse trainer keys — used in tests / debug reset.
 */
export async function clearAllStorageForTests (): Promise<void> {
	await AsyncStorage.multiRemove([
		STORAGE_KEYS.meta,
		STORAGE_KEYS.preferences,
		STORAGE_KEYS.progress,
		STORAGE_KEYS.symbolStats,
		STORAGE_KEYS.receiveSettings,
	])
	migrated = false
	symbolStatsQueue = Promise.resolve()
}

export { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './keys'
export {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_USER_PREFERENCES,
} from '@/src/types'
