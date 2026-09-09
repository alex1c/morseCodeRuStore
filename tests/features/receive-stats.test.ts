/**
 * Symbol stats recording + confusion map + serialized updates.
 */

import {
	clearAllStorageForTests,
	getReceiveSettings,
	getSymbolStatsMap,
	recordSymbolAttempt,
	resetStorageMigrationFlagForTests,
	saveReceiveSettings,
	STORAGE_KEYS,
	STORAGE_SCHEMA_VERSION,
	ensureStorageMigrated,
} from '@/src/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_RECEIVE_SETTINGS } from '@/src/features/receive'
import { applyAttemptToStats } from '@/src/domain'
import { createEmptySymbolStats } from '@/src/types'

describe('receive stats + storage', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('records attempts, confusion direction and average time', async () => {
		await recordSymbolAttempt({
			expectedSymbolId: 'ru-zh',
			isCorrect: false,
			responseTimeMs: 1000,
			answerSymbolId: 'ru-f',
		})
		await recordSymbolAttempt({
			expectedSymbolId: 'ru-zh',
			isCorrect: true,
			responseTimeMs: 500,
		})
		const map = await getSymbolStatsMap()
		const zh = map['ru-zh']
		expect(zh.attempts).toBe(2)
		expect(zh.correct).toBe(1)
		expect(zh.incorrect).toBe(1)
		expect(zh.confusionMap['ru-f']).toBe(1)
		expect(zh.averageResponseTimeMs).toBe(750)
	})

	test('paper mode null response time does not invent 0 ms', () => {
		const prev = createEmptySymbolStats('ru-a')
		const next = applyAttemptToStats(prev, {
			isCorrect: true,
			responseTimeMs: null,
			practicedAt: '2026-09-09T12:00:00.000Z',
		})
		expect(next.attempts).toBe(1)
		expect(next.averageResponseTimeMs).toBe(0)
	})

	test('serialized updates keep all attempts', async () => {
		await Promise.all([
			recordSymbolAttempt({
				expectedSymbolId: 'ru-a',
				isCorrect: true,
				responseTimeMs: 100,
			}),
			recordSymbolAttempt({
				expectedSymbolId: 'ru-a',
				isCorrect: false,
				responseTimeMs: 200,
				answerSymbolId: 'ru-t',
			}),
			recordSymbolAttempt({
				expectedSymbolId: 'ru-a',
				isCorrect: true,
				responseTimeMs: 300,
			}),
		])
		const map = await getSymbolStatsMap()
		expect(map['ru-a'].attempts).toBe(3)
		expect(map['ru-a'].correct).toBe(2)
		expect(map['ru-a'].incorrect).toBe(1)
	})

	test('receive settings persist and migrate to v3', async () => {
		await saveReceiveSettings({
			...DEFAULT_RECEIVE_SETTINGS,
			characterWpm: 18,
			answerMode: 'keyboard',
		})
		const loaded = await getReceiveSettings()
		expect(loaded.characterWpm).toBe(18)
		expect(loaded.answerMode).toBe('keyboard')

		await AsyncStorage.setItem(
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: 2 }),
		)
		resetStorageMigrationFlagForTests()
		await ensureStorageMigrated()
		const meta = JSON.parse(
			(await AsyncStorage.getItem(STORAGE_KEYS.meta)) ?? '{}',
		) as { schemaVersion: number }
		expect(meta.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		const settings = await getReceiveSettings()
		expect(settings.sessionLength).toBe(20)
	})
})
