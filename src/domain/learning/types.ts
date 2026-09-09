import type { AlphabetContext } from '@/src/domain/morse'

export type CourseId = 'ru-main' | 'latin-main'

export type LessonStageKind =
	| 'introduction'
	| 'recognition'
	| 'review'
	| 'mini-check'

export type Lesson = {
	id: string
	courseId: CourseId
	title: string
	description: string
	newSymbolIds: string[]
	reviewSymbolIds: string[]
	questionCount: {
		recognition: number
		review: number
		miniCheck: number
	}
	group:
		| 'Начало'
		| 'Основные буквы'
		| 'Продолжение'
		| 'Группы и слова'
		| 'Цифры'
}

export type Course = {
	id: CourseId
	title: string
	alphabet: AlphabetContext
	lessons: Lesson[]
}

export type LessonQuestion = {
	id: string
	symbolId: string
	optionSymbolIds: string[]
	stage: LessonStageKind
}

export type LessonSession = {
	lesson: Lesson
	questions: LessonQuestion[]
}

export type LessonQuestionResult = {
	questionId: string
	expectedSymbolId: string
	selectedSymbolId: string | null
	correct: boolean
}

export type LessonResult = {
	lessonId: string
	courseId: CourseId
	correct: number
	total: number
	accuracyPercent: number
	passed: boolean
	weakSymbolIds: string[]
}
