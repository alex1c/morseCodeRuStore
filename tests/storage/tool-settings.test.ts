/**
 * Tool settings storage schema v7.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	clearAllStorageForTests,
	ensureStorageMigrated,
	getToolSettings,
	resetStorageMigrationFlagForTests,
	saveToolSettings,
	STORAGE_KEYS,
	STORAGE_SCHEMA_VERSION,
} from '@/src/storage'
import { DEFAULT_TOOL_SETTINGS } from '@/src/types'

describe('tool settings storage', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('migrates to schema 7 with defaults', async () => {
		await AsyncStorage.setItem(
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: 6 }),
		)
		await ensureStorageMigrated()
		const meta = JSON.parse(
			(await AsyncStorage.getItem(STORAGE_KEYS.meta)) ?? '{}',
		) as { schemaVersion: number }
		expect(meta.schemaVersion).toBe(7)
		expect(STORAGE_SCHEMA_VERSION).toBe(7)
		const tools = await getToolSettings()
		expect(tools.outputMode).toBe(DEFAULT_TOOL_SETTINGS.outputMode)
	})

	test('persists settings without requiring user text', async () => {
		await saveToolSettings({
			...DEFAULT_TOOL_SETTINGS,
			translatorAlphabet: 'LATIN',
			outputMode: 'vibration',
			characterWpm: 18,
		})
		const loaded = await getToolSettings()
		expect(loaded.translatorAlphabet).toBe('LATIN')
		expect(loaded.outputMode).toBe('vibration')
		expect(loaded.characterWpm).toBe(18)
	})
})
