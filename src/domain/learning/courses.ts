import { getSymbolById, listLatinLetters, listRussianLetters } from '@/src/domain/morse'
import type { Course, CourseId, Lesson } from './types'

function makeLesson (
	id: string,
	courseId: CourseId,
	group: Lesson['group'],
	title: string,
	newSymbolIds: string[],
	reviewSymbolIds: string[],
): Lesson {
	return {
		id,
		courseId,
		group,
		title,
		description: 'Короткий урок: знакомство, узнавание, закрепление и мини-проверка.',
		newSymbolIds,
		reviewSymbolIds,
		questionCount: {
			recognition: 4,
			review: 4,
			miniCheck: 12,
		},
	}
}

const RU_LESSONS: Lesson[] = [
	makeLesson('ru-lesson-1', 'ru-main', 'Начало', 'Урок 1: А и Т', ['ru-a', 'ru-t'], ['ru-n', 'ru-o']),
	makeLesson('ru-lesson-2', 'ru-main', 'Начало', 'Урок 2: Н и О', ['ru-n', 'ru-o'], ['ru-a', 'ru-t']),
	makeLesson('ru-lesson-3', 'ru-main', 'Начало', 'Урок 3: И и С', ['ru-i', 'ru-s'], ['ru-a', 'ru-t', 'ru-n', 'ru-o']),
	makeLesson('ru-lesson-4', 'ru-main', 'Основные буквы', 'Урок 4: Р и В', ['ru-r', 'ru-v'], ['ru-a', 'ru-t', 'ru-n', 'ru-o', 'ru-i', 'ru-s']),
	makeLesson('ru-lesson-5', 'ru-main', 'Основные буквы', 'Урок 5: К и М', ['ru-k', 'ru-m'], ['ru-a', 'ru-t', 'ru-n', 'ru-o', 'ru-i', 'ru-s', 'ru-r', 'ru-v']),
	makeLesson('ru-lesson-6', 'ru-main', 'Продолжение', 'Урок 6: Д и У', ['ru-d', 'ru-u'], ['ru-a', 'ru-t', 'ru-n', 'ru-o', 'ru-i', 'ru-s', 'ru-r', 'ru-v', 'ru-k', 'ru-m']),
]

const LATIN_LESSONS: Lesson[] = [
	makeLesson('latin-lesson-1', 'latin-main', 'Начало', 'Lesson 1: E and T', ['latin-e', 'latin-t'], ['latin-a', 'latin-n']),
	makeLesson('latin-lesson-2', 'latin-main', 'Начало', 'Lesson 2: A and N', ['latin-a', 'latin-n'], ['latin-e', 'latin-t']),
	makeLesson('latin-lesson-3', 'latin-main', 'Начало', 'Lesson 3: O and I', ['latin-o', 'latin-i'], ['latin-e', 'latin-t', 'latin-a', 'latin-n']),
	makeLesson('latin-lesson-4', 'latin-main', 'Основные буквы', 'Lesson 4: S and R', ['latin-s', 'latin-r'], ['latin-e', 'latin-t', 'latin-a', 'latin-n', 'latin-o', 'latin-i']),
	makeLesson('latin-lesson-5', 'latin-main', 'Основные буквы', 'Lesson 5: K and M', ['latin-k', 'latin-m'], ['latin-e', 'latin-t', 'latin-a', 'latin-n', 'latin-o', 'latin-i', 'latin-s', 'latin-r']),
	makeLesson('latin-lesson-6', 'latin-main', 'Продолжение', 'Lesson 6: D and U', ['latin-d', 'latin-u'], ['latin-e', 'latin-t', 'latin-a', 'latin-n', 'latin-o', 'latin-i', 'latin-s', 'latin-r', 'latin-k', 'latin-m']),
]

export const COURSES: Course[] = [
	{
		id: 'ru-main',
		title: 'Русский курс',
		alphabet: 'RU',
		lessons: RU_LESSONS,
	},
	{
		id: 'latin-main',
		title: 'International / Latin',
		alphabet: 'LATIN',
		lessons: LATIN_LESSONS,
	},
]

export function getCourseById (courseId: CourseId): Course | undefined {
	return COURSES.find((course) => course.id === courseId)
}

export function getLessonById (lessonId: string): Lesson | undefined {
	for (const course of COURSES) {
		const lesson = course.lessons.find((item) => item.id === lessonId)
		if (lesson) {
			return lesson
		}
	}
	return undefined
}

export function listCourseSymbols (courseId: CourseId): string[] {
	const course = getCourseById(courseId)
	if (!course) {
		return []
	}
	const set = new Set<string>()
	for (const lesson of course.lessons) {
		for (const id of lesson.newSymbolIds) {
			set.add(id)
		}
		for (const id of lesson.reviewSymbolIds) {
			set.add(id)
		}
	}
	return [...set]
}

export function getCourseAlphabetSymbols (courseId: CourseId): string[] {
	return courseId === 'ru-main'
		? listRussianLetters().map((symbol) => symbol.id)
		: listLatinLetters().map((symbol) => symbol.id)
}

export function assertCourseReferencesValid (): string[] {
	const errors: string[] = []
	for (const course of COURSES) {
		for (const lesson of course.lessons) {
			const seenNew = new Set<string>()
			for (const id of lesson.newSymbolIds) {
				if (seenNew.has(id)) {
					errors.push(`duplicate new symbol ${id} in ${lesson.id}`)
				}
				seenNew.add(id)
				const symbol = getSymbolById(id)
				if (!symbol) {
					errors.push(`unknown symbol ${id} in ${lesson.id}`)
				}
				if (course.id === 'ru-main' && symbol?.family !== 'RU') {
					errors.push(`mixed alphabet symbol ${id} in ${lesson.id}`)
				}
				if (course.id === 'latin-main' && symbol?.family !== 'LATIN') {
					errors.push(`mixed alphabet symbol ${id} in ${lesson.id}`)
				}
			}
		}
	}
	return errors
}
