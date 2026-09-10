/**
 * Storage v6 — session history + daily persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	appendSessionRecord,
	clearAllStorageForTests,
	ensureStorageMigrated,
	getDailyState,
	getSessionHistory,
	recordDailyCompletion,
	resetStorageMigrationFlagForTests,
	STORAGE_KEYS,
	STORAGE_SCHEMA_VERSION,
} from '@/src/storage'
import type { SessionSummary } from '@/src/domain/session-history'

describe('storage session history + daily', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('migrates to schema 6 with empty history/daily', async () => {
		await AsyncStorage.setItem(
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: 5 }),
		)
		await ensureStorageMigrated()
		const meta = JSON.parse(
			(await AsyncStorage.getItem(STORAGE_KEYS.meta)) ?? '{}',
		) as { schemaVersion: number }
		expect(meta.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(STORAGE_SCHEMA_VERSION).toBe(6)
		const history = await getSessionHistory()
		expect(history.sessions).toEqual([])
		const daily = await getDailyState()
		expect(daily.completedDates).toEqual([])
	})

	test('append persists and dedupes; daily completion once per day', async () => {
		const summary: SessionSummary = {
			id: 'sess-1',
			finishedAt: '2026-09-10T12:00:00.000Z',
			localDate: '2026-09-10',
			source: 'daily',
			alphabet: 'RU',
			contentKind: 'group',
			itemCount: 48,
			correctItems: 40,
			itemAccuracyPercent: 83,
			characterCorrect: 100,
			characterTotal: 120,
			characterAccuracyPercent: 83,
			durationMs: 300000,
			averageResponseTimeMs: 1000,
			lessonId: null,
			courseId: null,
			transmitTimingQuality: null,
		}
		await appendSessionRecord(summary)
		await appendSessionRecord(summary)
		const history = await getSessionHistory()
		expect(history.sessions).toHaveLength(1)
		expect(history.sessions[0].source).toBe('daily')

		await recordDailyCompletion({
			dateKey: '2026-09-10',
			completedAt: '2026-09-10T12:00:00.000Z',
			itemsCorrect: 40,
			itemsTotal: 48,
			characterAccuracyPercent: 83,
			durationMs: 300000,
		})
		await recordDailyCompletion({
			dateKey: '2026-09-10',
			completedAt: '2026-09-10T18:00:00.000Z',
			itemsCorrect: 45,
			itemsTotal: 48,
			characterAccuracyPercent: 90,
			durationMs: 280000,
		})
		const daily = await getDailyState()
		expect(daily.completedDates).toEqual(['2026-09-10'])
		expect(daily.lastCompletion?.itemsCorrect).toBe(45)
	})
})
