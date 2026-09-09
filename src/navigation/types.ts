/**
 * Navigation route names and param lists for the root stack.
 */

export type RootStackParamList = {
	Onboarding: undefined
	Home: undefined
	Lesson: undefined
	LessonResult: {
		lessonId: string
		courseId: 'ru-main' | 'latin-main'
		correct: number
		total: number
		accuracyPercent: number
		weakSymbolIds: string[]
		passed: boolean
	}
	Receive: undefined
	Transmit: undefined
	Errors: undefined
	QuickPractice: undefined
	Course: undefined
	Stats: undefined
	Translator: undefined
	Reference: undefined
	Learning: undefined
	Settings: undefined
}
