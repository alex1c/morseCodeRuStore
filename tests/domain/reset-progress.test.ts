/**
 * resetProgressKeepingPreferences — clears progress/stats/history/daily,
 * keeps theme / signal preferences and mode settings.
 */

import { resetProgressKeepingPreferences } from '@/src/domain/backup'
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
	saveDailyState,
	saveLearningProgress,
	saveReceiveSettings,
	saveSessionHistory,
	saveSymbolStatsMap,
	saveToolSettings,
	saveTransmitSettings,
	saveTransmitStatsMap,
	saveUserPreferences,
} from '@/src/storage'
import {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_TOOL_SETTINGS,
	DEFAULT_USER_PREFERENCES,
} from '@/src/types'
import { DEFAULT_RECEIVE_SETTINGS } from '@/src/features/receive'
import { DEFAULT_TRANSMIT_SETTINGS } from '@/src/features/transmit'

describe('resetProgressKeepingPreferences', () => {
	beforeEach(async () => {
		resetStorageMigrationFlag()
		await clearAllStorageForTests()
	})

	test('deletes progress/stats/history/daily/transmit stats but keeps prefs', async () => {
		await saveUserPreferences({
			...DEFAULT_USER_PREFERENCES,
			onboardingCompleted: true,
			selectedAlphabet: 'LATIN',
			themePreference: 'dark',
			targetWpm: 22,
			toneFrequencyHz: 700,
			farnsworthMultiplier: 2,
			soundEnabled: false,
			vibrationEnabled: true,
		})
		await saveLearningProgress({
			...DEFAULT_LEARNING_PROGRESS,
			currentCourseId: 'latin-main',
			currentLessonId: 'latin-lesson-3',
			unlockedLessonIds: ['latin-lesson-1', 'latin-lesson-2', 'latin-lesson-3'],
			completedLessonIds: ['latin-lesson-1', 'latin-lesson-2'],
			knownSymbolIds: ['latin-e', 'latin-t'],
			lastSessionDate: '2026-09-09',
		})
		await saveSymbolStatsMap({
			'latin-e': {
				symbolId: 'latin-e',
				attempts: 10,
				correct: 8,
				incorrect: 2,
				averageResponseTimeMs: 300,
				lastPracticedAt: '2026-09-09T10:00:00.000Z',
				confusionMap: { 'latin-i': 1 },
			},
		})
		await saveTransmitStatsMap({
			'latin-e': {
				symbolId: 'latin-e',
				attempts: 4,
				correct: 3,
				incorrect: 1,
				hintsUsed: 1,
				averageQualityScore: 0.8,
				lastPracticedAt: null,
			},
		})
		await saveSessionHistory({
			sessions: [
				{
					id: 'sess-1',
					finishedAt: '2026-09-09T12:00:00.000Z',
					localDate: '2026-09-09',
					source: 'lesson',
					alphabet: 'LATIN',
					contentKind: null,
					itemCount: 10,
					correctItems: 9,
					itemAccuracyPercent: 90,
					characterCorrect: null,
					characterTotal: null,
					characterAccuracyPercent: null,
					durationMs: 5000,
					averageResponseTimeMs: 400,
					lessonId: 'latin-lesson-1',
					courseId: 'latin-main',
					transmitTimingQuality: null,
				},
			],
		})
		await saveDailyState({
			completedDates: ['2026-09-08', '2026-09-09'],
			lastCompletion: {
				dateKey: '2026-09-09',
				completedAt: '2026-09-09T18:00:00.000Z',
				itemsCorrect: 12,
				itemsTotal: 15,
				characterAccuracyPercent: 80,
				durationMs: 120000,
			},
		})
		await saveReceiveSettings({
			...DEFAULT_RECEIVE_SETTINGS,
			characterWpm: 18,
			alphabet: 'LATIN',
		})
		await saveTransmitSettings({
			...DEFAULT_TRANSMIT_SETTINGS,
			characterWpm: 16,
			alphabet: 'LATIN',
		})
		await saveToolSettings({
			...DEFAULT_TOOL_SETTINGS,
			toneFrequencyHz: 550,
			outputMode: 'vibration',
		})

		await resetProgressKeepingPreferences()

		const prefs = await getUserPreferences()
		expect(prefs.themePreference).toBe('dark')
		expect(prefs.selectedAlphabet).toBe('LATIN')
		expect(prefs.targetWpm).toBe(22)
		expect(prefs.toneFrequencyHz).toBe(700)
		expect(prefs.farnsworthMultiplier).toBe(2)
		expect(prefs.soundEnabled).toBe(false)
		expect(prefs.vibrationEnabled).toBe(true)
		expect(prefs.onboardingCompleted).toBe(true)

		const progress = await getLearningProgress()
		expect(progress.currentCourseId).toBe('latin-main')
		expect(progress.currentLessonId).toBe('latin-lesson-1')
		expect(progress.unlockedLessonIds).toEqual(['latin-lesson-1'])
		expect(progress.completedLessonIds).toEqual([])
		expect(progress.knownSymbolIds).toEqual([])
		expect(progress.lastSessionDate).toBeNull()

		expect(await getSymbolStatsMap()).toEqual({})
		expect(await getTransmitStatsMap()).toEqual({})
		expect(await getSessionHistory()).toEqual({ sessions: [] })
		expect(await getDailyState()).toEqual({
			completedDates: [],
			lastCompletion: null,
		})

		const receive = await getReceiveSettings()
		expect(receive.characterWpm).toBe(18)
		expect(receive.alphabet).toBe('LATIN')

		const transmit = await getTransmitSettings()
		expect(transmit.characterWpm).toBe(16)

		const tools = await getToolSettings()
		expect(tools.toneFrequencyHz).toBe(550)
		expect(tools.outputMode).toBe('vibration')
	})

	test('RU alphabet resets to ru-lesson-1', async () => {
		await saveUserPreferences({
			...DEFAULT_USER_PREFERENCES,
			onboardingCompleted: true,
			selectedAlphabet: 'RU',
			themePreference: 'system',
		})
		await saveLearningProgress({
			...DEFAULT_LEARNING_PROGRESS,
			completedLessonIds: ['ru-lesson-1', 'ru-lesson-2'],
		})

		await resetProgressKeepingPreferences()

		const progress = await getLearningProgress()
		expect(progress.currentCourseId).toBe('ru-main')
		expect(progress.currentLessonId).toBe('ru-lesson-1')
		expect(progress.unlockedLessonIds).toEqual(['ru-lesson-1'])
	})
})
