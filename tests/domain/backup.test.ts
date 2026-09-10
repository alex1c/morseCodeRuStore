/**
 * Backup export payload, parse / validate / normalize, and restore tests.
 */

import {
	BACKUP_APP,
	BACKUP_FORMAT,
	BACKUP_READ_ERROR,
	BACKUP_SCHEMA_VERSION,
	buildBackupPayload,
	createBackupDocument,
	normalizeBackupPayload,
	parseBackupJson,
	restoreFromBackupObject,
	restoreFromJsonString,
	serializeBackup,
	validateBackup,
	type MorseBackupDocument,
} from '@/src/domain/backup'
import { SESSION_HISTORY_MAX } from '@/src/domain/session-history'
import {
	clearAllStorageForTests,
	getDailyState,
	getLearningProgress,
	getReceiveSettings,
	getSessionHistory,
	getSymbolStatsMap,
	getToolSettings,
	getTransmitSettings,
	getTransmitStatsMap,
	getUserPreferences,
	resetStorageMigrationFlag,
	saveLearningProgress,
	saveUserPreferences,
	updateUserPreferences,
} from '@/src/storage'
import {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_TOOL_SETTINGS,
	DEFAULT_USER_PREFERENCES,
} from '@/src/types'
import { DEFAULT_RECEIVE_SETTINGS } from '@/src/features/receive'
import { DEFAULT_TRANSMIT_SETTINGS } from '@/src/features/transmit'

function minimalValidBackup (
	overrides: Partial<MorseBackupDocument> = {},
): MorseBackupDocument {
	return {
		format: BACKUP_FORMAT,
		app: BACKUP_APP,
		version: '1.0.0',
		createdAt: '2026-09-10T12:00:00.000Z',
		schemaVersion: BACKUP_SCHEMA_VERSION,
		payload: {
			preferences: { ...DEFAULT_USER_PREFERENCES, themePreference: 'dark' },
			progress: {
				...DEFAULT_LEARNING_PROGRESS,
				completedLessonIds: ['ru-lesson-1'],
			},
			symbolStats: {
				'ru-a': {
					symbolId: 'ru-a',
					attempts: 3,
					correct: 2,
					incorrect: 1,
					averageResponseTimeMs: 400,
					lastPracticedAt: null,
					confusionMap: {},
				},
			},
			receiveSettings: { ...DEFAULT_RECEIVE_SETTINGS },
			transmitSettings: { ...DEFAULT_TRANSMIT_SETTINGS },
			transmitStats: {},
			sessionHistory: { sessions: [] },
			daily: { completedDates: ['2026-09-09'], lastCompletion: null },
			toolSettings: { ...DEFAULT_TOOL_SETTINGS },
		},
		...overrides,
	}
}

describe('backup export payload', () => {
	beforeEach(async () => {
		resetStorageMigrationFlag()
		await clearAllStorageForTests()
	})

	test('includes expected user-data keys', async () => {
		const payload = await buildBackupPayload()
		expect(Object.keys(payload).sort()).toEqual([
			'daily',
			'preferences',
			'progress',
			'receiveSettings',
			'sessionHistory',
			'symbolStats',
			'toolSettings',
			'transmitSettings',
			'transmitStats',
		].sort())
	})

	test('does not include translator user text fields', async () => {
		const payload = await buildBackupPayload()
		const json = JSON.stringify(payload)
		expect(json).not.toMatch(/translatorText/i)
		expect(json).not.toMatch(/"text"\s*:/)
		expect(payload.toolSettings).not.toHaveProperty('inputText')
		expect(payload.toolSettings).not.toHaveProperty('outputText')
		expect(payload.toolSettings).not.toHaveProperty('translatorText')
	})

	test('createBackupDocument wraps payload with format metadata', async () => {
		const doc = await createBackupDocument()
		expect(doc.format).toBe(BACKUP_FORMAT)
		expect(doc.app).toBe(BACKUP_APP)
		expect(doc.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
		expect(typeof doc.createdAt).toBe('string')
		expect(doc.payload.preferences).toEqual(DEFAULT_USER_PREFERENCES)
	})
})

describe('backup parse / validate', () => {
	test('parses a valid backup JSON string', () => {
		const raw = serializeBackup(minimalValidBackup())
		const result = parseBackupJson(raw)
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.backup.format).toBe(BACKUP_FORMAT)
			expect(result.backup.payload.preferences.themePreference).toBe('dark')
		}
	})

	test('rejects invalid JSON', () => {
		const result = parseBackupJson('{not-json')
		expect(result).toEqual({ ok: false, error: BACKUP_READ_ERROR })
	})

	test('rejects wrong format', () => {
		const result = validateBackup(
			minimalValidBackup({ format: 'other-app-backup' as never }),
		)
		expect(result).toEqual({ ok: false, error: BACKUP_READ_ERROR })
	})

	test('rejects unsupported schema version', () => {
		const result = validateBackup(
			minimalValidBackup({ schemaVersion: BACKUP_SCHEMA_VERSION + 1 }),
		)
		expect(result).toEqual({ ok: false, error: BACKUP_READ_ERROR })
	})

	test('rejects missing payload structures', () => {
		const broken = minimalValidBackup()
		delete (broken.payload as { daily?: unknown }).daily
		expect(validateBackup(broken)).toEqual({
			ok: false,
			error: BACKUP_READ_ERROR,
		})

		const noSessions = minimalValidBackup()
		;(noSessions.payload.sessionHistory as { sessions: unknown }).sessions =
			null
		expect(validateBackup(noSessions)).toEqual({
			ok: false,
			error: BACKUP_READ_ERROR,
		})
	})
})

describe('backup normalize', () => {
	test('clamps WPM / tone / farnsworth and prunes session history', () => {
		const oversizedSessions = Array.from(
			{ length: SESSION_HISTORY_MAX + 40 },
			(_, i) => ({
				id: `s-${i}`,
				finishedAt: '2026-09-10T00:00:00.000Z',
				localDate: '2026-09-10',
				source: 'receive' as const,
				alphabet: 'RU' as const,
				contentKind: 'symbol',
				itemCount: 10,
				correctItems: 8,
				itemAccuracyPercent: 80,
				characterCorrect: null,
				characterTotal: null,
				characterAccuracyPercent: null,
				durationMs: 1000,
				averageResponseTimeMs: null,
				lessonId: null,
				courseId: null,
				transmitTimingQuality: null,
			}),
		)
		const normalized = normalizeBackupPayload({
			preferences: {
				...DEFAULT_USER_PREFERENCES,
				targetWpm: 99,
				toneFrequencyHz: 50,
				farnsworthMultiplier: 9,
				selectedAlphabet: 'KLINGON' as never,
				themePreference: 'neon' as never,
			},
			progress: { ...DEFAULT_LEARNING_PROGRESS },
			symbolStats: {},
			receiveSettings: {
				...DEFAULT_RECEIVE_SETTINGS,
				characterWpm: 1,
				toneFrequencyHz: 2000,
			},
			transmitSettings: { ...DEFAULT_TRANSMIT_SETTINGS },
			transmitStats: {},
			sessionHistory: { sessions: oversizedSessions },
			daily: { completedDates: [], lastCompletion: null },
			toolSettings: {
				...DEFAULT_TOOL_SETTINGS,
				characterWpm: 100,
				farnsworthMultiplier: 0.2,
			},
		})

		expect(normalized.preferences.targetWpm).toBe(40)
		expect(normalized.preferences.toneFrequencyHz).toBe(300)
		expect(normalized.preferences.farnsworthMultiplier).toBe(3)
		expect(normalized.preferences.selectedAlphabet).toBe('RU')
		expect(normalized.preferences.themePreference).toBe('system')
		expect(normalized.receiveSettings.characterWpm).toBe(5)
		expect(normalized.receiveSettings.toneFrequencyHz).toBe(1000)
		expect(normalized.toolSettings.characterWpm).toBe(40)
		expect(normalized.toolSettings.farnsworthMultiplier).toBe(1)
		expect(normalized.sessionHistory.sessions).toHaveLength(
			SESSION_HISTORY_MAX,
		)
	})
})

describe('backup restore', () => {
	beforeEach(async () => {
		resetStorageMigrationFlag()
		await clearAllStorageForTests()
	})

	test('restores all payload keys into storage', async () => {
		await updateUserPreferences({
			themePreference: 'light',
			targetWpm: 10,
		})
		await saveLearningProgress({
			...DEFAULT_LEARNING_PROGRESS,
			completedLessonIds: ['ru-lesson-2'],
		})

		const backup = minimalValidBackup()
		const result = await restoreFromBackupObject(backup)
		expect(result.ok).toBe(true)

		const prefs = await getUserPreferences()
		expect(prefs.themePreference).toBe('dark')

		const progress = await getLearningProgress()
		expect(progress.completedLessonIds).toEqual(['ru-lesson-1'])

		const stats = await getSymbolStatsMap()
		expect(stats['ru-a']?.attempts).toBe(3)

		const daily = await getDailyState()
		expect(daily.completedDates).toEqual(['2026-09-09'])

		const history = await getSessionHistory()
		expect(history.sessions).toEqual([])

		const receive = await getReceiveSettings()
		expect(receive.characterWpm).toBe(DEFAULT_RECEIVE_SETTINGS.characterWpm)

		const transmit = await getTransmitSettings()
		expect(transmit.sessionLength).toBe(
			DEFAULT_TRANSMIT_SETTINGS.sessionLength,
		)

		const transmitStats = await getTransmitStatsMap()
		expect(transmitStats).toEqual({})

		const tools = await getToolSettings()
		expect(tools.outputMode).toBe('audio')
	})

	test('restoreFromJsonString rejects invalid payload without writing', async () => {
		await saveUserPreferences({
			...DEFAULT_USER_PREFERENCES,
			themePreference: 'light',
		})
		const result = await restoreFromJsonString(
			JSON.stringify({ format: 'nope' }),
		)
		expect(result.ok).toBe(false)
		const prefs = await getUserPreferences()
		expect(prefs.themePreference).toBe('light')
	})
})
