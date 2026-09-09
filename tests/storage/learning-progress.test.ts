import {
	clearAllStorageForTests,
	ensureStorageMigrated,
	getLearningProgress,
	resetStorageMigrationFlagForTests,
	saveLearningProgress,
	STORAGE_KEYS,
} from '@/src/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	chooseCurrentCourse,
	saveLessonResultAndProgress,
} from '@/src/features/learning/progress'

describe('learning progress persistence', () => {
	beforeEach(async () => {
		resetStorageMigrationFlagForTests()
		await clearAllStorageForTests()
	})

	test('fresh user starts from first lesson', async () => {
		const progress = await getLearningProgress()
		expect(progress.currentCourseId).toBe('ru-main')
		expect(progress.currentLessonId).toBe('ru-lesson-1')
	})

	test('successful completion saves completed and advances lesson', async () => {
		await saveLessonResultAndProgress({
			lessonId: 'ru-lesson-1',
			courseId: 'ru-main',
			correct: 18,
			total: 20,
			accuracyPercent: 90,
			passed: true,
			weakSymbolIds: [],
		})
		const progress = await getLearningProgress()
		expect(progress.completedLessonIds).toContain('ru-lesson-1')
		expect(progress.currentLessonId).toBe('ru-lesson-2')
		expect(progress.bestLessonScorePercentById['ru-lesson-1']).toBe(90)
	})

	test('completed lesson remains completed after app restart simulation', async () => {
		const p = await getLearningProgress()
		await saveLearningProgress({
			...p,
			completedLessonIds: ['ru-lesson-1'],
		})
		resetStorageMigrationFlagForTests()
		const loaded = await getLearningProgress()
		expect(loaded.completedLessonIds).toContain('ru-lesson-1')
	})

	test('course selection is persisted', async () => {
		await chooseCurrentCourse('latin-main')
		const progress = await getLearningProgress()
		expect(progress.currentCourseId).toBe('latin-main')
		expect(progress.currentLessonId).toBe('latin-lesson-1')
	})

	test('migration from phase 1 progress adds new fields', async () => {
		await AsyncStorage.setItem(
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: 1 }),
		)
		await AsyncStorage.setItem(
			STORAGE_KEYS.progress,
			JSON.stringify({
				currentLessonId: 'lesson-1',
				unlockedLessonIds: ['lesson-1'],
				knownSymbolIds: ['ru-a'],
				lastSessionDate: null,
			}),
		)
		resetStorageMigrationFlagForTests()
		await ensureStorageMigrated()
		const progress = await getLearningProgress()
		expect(progress.currentCourseId).toBe('ru-main')
		expect(progress.completedLessonIds).toEqual([])
		expect(progress.bestLessonScorePercentById).toEqual({})
	})
})
