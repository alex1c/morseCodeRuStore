import {
	getLearningProgress,
	saveLearningProgress,
	updateLearningProgress,
} from '@/src/storage'
import {
	COURSES,
	getCourseById,
	getLessonById,
	LESSON_PASS_THRESHOLD_PERCENT,
	type CourseId,
	type LessonResult,
} from '@/src/domain/learning'
import { toLocalDateString } from '@/src/features/learning/time'
import type { LearningProgress } from '@/src/types'

function firstLessonIdForCourse (courseId: CourseId): string {
	const course = getCourseById(courseId)
	return course?.lessons[0]?.id ?? 'ru-lesson-1'
}

export async function chooseCurrentCourse (
	courseId: CourseId,
): Promise<LearningProgress> {
	const current = await getLearningProgress()
	const currentLessonId = current.unlockedLessonIds.find((id) =>
		id.startsWith(courseId === 'ru-main' ? 'ru-' : 'latin-'),
	) ?? firstLessonIdForCourse(courseId)
	return updateLearningProgress({
		currentCourseId: courseId,
		currentLessonId,
	})
}

export async function ensureCourseDefaults (
	preferred: 'RU' | 'LATIN' | 'BOTH',
): Promise<LearningProgress> {
	const progress = await getLearningProgress()
	if (progress.currentLessonId.startsWith('lesson-')) {
		const mappedCourse = preferred === 'LATIN' ? 'latin-main' : 'ru-main'
		const firstLessonId = firstLessonIdForCourse(mappedCourse)
		const normalized = {
			...progress,
			currentCourseId: mappedCourse,
			currentLessonId: firstLessonId,
			unlockedLessonIds: [
				firstLessonId,
				...progress.unlockedLessonIds.filter((id) => id !== firstLessonId),
			],
		}
		await saveLearningProgress(normalized)
		return normalized
	}
	return progress
}

export async function saveLessonResultAndProgress (
	result: LessonResult,
): Promise<LearningProgress> {
	const current = await getLearningProgress()
	const lesson = getLessonById(result.lessonId)
	if (!lesson) {
		return current
	}
	const completed = new Set(current.completedLessonIds)
	completed.add(lesson.id)
	const bestMap = {
		...current.bestLessonScorePercentById,
		[lesson.id]: Math.max(
			current.bestLessonScorePercentById[lesson.id] ?? 0,
			result.accuracyPercent,
		),
	}
	const knownSymbols = new Set(current.knownSymbolIds)
	lesson.newSymbolIds.forEach((id) => {
		knownSymbols.add(id)
	})
	const course = COURSES.find((item) => item.id === lesson.courseId)
	const idx = course?.lessons.findIndex((item) => item.id === lesson.id) ?? -1
	const nextLessonId = idx >= 0 ? course?.lessons[idx + 1]?.id : undefined
	const unlocked = new Set(current.unlockedLessonIds)
	unlocked.add(lesson.id)
	if (nextLessonId) {
		// Soft-unlock next lesson after completion attempt.
		unlocked.add(nextLessonId)
	}
	const currentLessonId = nextLessonId ?? lesson.id
	return updateLearningProgress({
		currentCourseId: lesson.courseId,
		currentLessonId,
		completedLessonIds: [...completed],
		unlockedLessonIds: [...unlocked],
		knownSymbolIds: [...knownSymbols],
		bestLessonScorePercentById: bestMap,
		lastSessionDate: toLocalDateString(),
	})
}

export function hasLessonPassed (percent: number): boolean {
	return percent >= LESSON_PASS_THRESHOLD_PERCENT
}
