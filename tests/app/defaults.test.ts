/**
 * Cold-start contracts: defaults must allow UI to boot with empty storage.
 */

import {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_USER_PREFERENCES,
} from '@/src/types'

describe('app start without data', () => {
	test('default preferences are a complete bootable snapshot', () => {
		expect(DEFAULT_USER_PREFERENCES.onboardingCompleted).toBe(false)
		expect(DEFAULT_USER_PREFERENCES.selectedAlphabet).toBeDefined()
		expect(DEFAULT_USER_PREFERENCES.themePreference).toBe('system')
		expect(DEFAULT_LEARNING_PROGRESS.currentLessonId).toBe('ru-lesson-1')
		expect(
			DEFAULT_LEARNING_PROGRESS.unlockedLessonIds.includes('ru-lesson-1'),
		).toBe(true)
	})
})
