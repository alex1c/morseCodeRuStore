/**
 * Persistence defaults and alphabet selection.
 */

import {
	clearAllStorageForTests,
	DEFAULT_USER_PREFERENCES,
	getLearningProgress,
	getUserPreferences,
	resetStorageMigrationFlagForTests,
	saveSelectedAlphabet,
} from '@/src/storage'

describe('persistence foundation', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('returns default preferences when storage is empty', async () => {
		const prefs = await getUserPreferences()
		expect(prefs).toEqual(DEFAULT_USER_PREFERENCES)
		expect(prefs.onboardingCompleted).toBe(false)
		expect(prefs.selectedAlphabet).toBe('RU')
		expect(prefs.toneFrequencyHz).toBe(600)
		expect(prefs.targetWpm).toBe(15)
		expect(prefs.farnsworthMultiplier).toBe(1.5)
		expect(prefs.soundEnabled).toBe(true)
		expect(prefs.vibrationEnabled).toBe(true)
		expect(prefs.themePreference).toBe('system')
	})

	test('saves alphabet selection and completes onboarding', async () => {
		const saved = await saveSelectedAlphabet('LATIN')
		expect(saved.selectedAlphabet).toBe('LATIN')
		expect(saved.onboardingCompleted).toBe(true)

		const loaded = await getUserPreferences()
		expect(loaded.selectedAlphabet).toBe('LATIN')
		expect(loaded.onboardingCompleted).toBe(true)
	})

	test('returns default learning progress without prior data', async () => {
		const progress = await getLearningProgress()
		expect(progress.currentLessonId).toBe('ru-lesson-1')
		expect(progress.currentCourseId).toBe('ru-main')
		expect(progress.unlockedLessonIds).toEqual(['ru-lesson-1'])
		expect(progress.completedLessonIds).toEqual([])
		expect(progress.knownSymbolIds).toEqual([])
		expect(progress.lastSessionDate).toBeNull()
	})
})
