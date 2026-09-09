import {
	createSeededRandom,
	generateLessonSession,
	generateQuestionOptions,
	getCourseById,
} from '@/src/domain'

describe('lesson session generator', () => {
	test('creates four unique options with correct answer included', () => {
		const random = createSeededRandom(1234)
		const options = generateQuestionOptions(
			'latin-e',
			['latin-e', 'latin-t', 'latin-a', 'latin-n', 'latin-o'],
			random,
		)
		expect(options).toContain('latin-e')
		expect(new Set(options).size).toBe(4)
	})

	test('generates deterministic session by seed', () => {
		const lesson = getCourseById('latin-main')!.lessons[0]
		const a = generateLessonSession(lesson, [], 42)
		const b = generateLessonSession(lesson, [], 42)
		expect(a.questions.map((q) => q.symbolId)).toEqual(
			b.questions.map((q) => q.symbolId),
		)
		expect(a.questions.map((q) => q.optionSymbolIds)).toEqual(
			b.questions.map((q) => q.optionSymbolIds),
		)
		expect(
			a.questions.every((question) =>
				question.optionSymbolIds.every((id) => id.startsWith('latin-')),
			),
		).toBe(true)
	})
})
