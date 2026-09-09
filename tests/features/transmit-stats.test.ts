/**
 * Transmit stats + storage isolation from Receive.
 */

import {
	clearAllStorageForTests,
	getReceiveSettings,
	getSymbolStatsMap,
	getTransmitSettings,
	getTransmitStatsMap,
	recordSymbolAttempt,
	recordTransmitAttempt,
	resetStorageMigrationFlagForTests,
	saveTransmitSettings,
	STORAGE_KEYS,
	STORAGE_SCHEMA_VERSION,
	ensureStorageMigrated,
} from '@/src/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	DEFAULT_TRANSMIT_SETTINGS,
	buildTransmitErrorFocusPool,
	generateTransmitQuestions,
	resolveTransmitSymbolPool,
} from '@/src/features/transmit'

describe('transmit stats + storage', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('records transmit attempts without touching receive stats', async () => {
		await recordTransmitAttempt({
			symbolId: 'ru-a',
			isCorrect: false,
			hintUsed: true,
			averageQualityScore: 0.5,
		})
		await recordTransmitAttempt({
			symbolId: 'ru-a',
			isCorrect: true,
			hintUsed: false,
			averageQualityScore: 0.9,
		})
		const transmit = await getTransmitStatsMap()
		expect(transmit['ru-a'].attempts).toBe(2)
		expect(transmit['ru-a'].correct).toBe(1)
		expect(transmit['ru-a'].hintsUsed).toBe(1)

		await recordSymbolAttempt({
			expectedSymbolId: 'ru-a',
			isCorrect: true,
			responseTimeMs: 400,
		})
		const receive = await getSymbolStatsMap()
		expect(receive['ru-a'].attempts).toBe(1)
		expect(transmit['ru-a'].attempts).toBe(2)
	})

	test('transmit settings persist and migrate to v4', async () => {
		await saveTransmitSettings({
			...DEFAULT_TRANSMIT_SETTINGS,
			characterWpm: 18,
		})
		const loaded = await getTransmitSettings()
		expect(loaded.characterWpm).toBe(18)

		await AsyncStorage.setItem(
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: 3 }),
		)
		resetStorageMigrationFlagForTests()
		await ensureStorageMigrated()
		const meta = JSON.parse(
			(await AsyncStorage.getItem(STORAGE_KEYS.meta)) ?? '{}',
		) as { schemaVersion: number }
		expect(meta.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		const receive = await getReceiveSettings()
		expect(receive.sessionLength).toBe(20)
	})
})

describe('transmit generator', () => {
	test('alphabet isolation and deterministic seed', () => {
		const pool = resolveTransmitSymbolPool({
			alphabet: 'LATIN',
			preset: 'known',
			knownSymbolIds: [],
			customSymbolIds: [],
		})
		expect(pool.every((id) => id.startsWith('latin-'))).toBe(true)
		const a = generateTransmitQuestions({
			alphabet: 'LATIN',
			symbolPool: pool,
			sessionLength: 10,
			seed: 42,
		})
		const b = generateTransmitQuestions({
			alphabet: 'LATIN',
			symbolPool: pool,
			sessionLength: 10,
			seed: 42,
		})
		expect(a.map((q) => q.symbolId)).toEqual(b.map((q) => q.symbolId))
	})

	test('error focus pool keeps alphabet and distractors', () => {
		const focus = buildTransmitErrorFocusPool(
			['ru-zh', 'ru-f'],
			'RU',
			['ru-a', 'ru-t', 'ru-n'],
		)
		expect(focus.symbolIds).toEqual(
			expect.arrayContaining(['ru-zh', 'ru-f']),
		)
		expect(focus.symbolIds.length).toBeGreaterThan(2)
		expect(focus.weights['ru-zh']).toBeGreaterThan(focus.weights['ru-a'] ?? 0)
	})
})
