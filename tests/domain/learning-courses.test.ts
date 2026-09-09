import {
	assertCourseReferencesValid,
	COURSES,
	getSymbolById,
} from '@/src/domain'

describe('learning courses', () => {
	test('course references are valid and no mixed alphabets', () => {
		expect(assertCourseReferencesValid()).toEqual([])
	})

	test('contains Russian and Latin course lessons', () => {
		const ru = COURSES.find((course) => course.id === 'ru-main')
		const latin = COURSES.find((course) => course.id === 'latin-main')
		expect(ru?.lessons.length).toBeGreaterThanOrEqual(5)
		expect(latin?.lessons.length).toBeGreaterThanOrEqual(5)
	})

	test('all lesson symbols exist in catalog and no duplicate new symbols', () => {
		for (const course of COURSES) {
			for (const lesson of course.lessons) {
				const set = new Set<string>()
				for (const symbolId of lesson.newSymbolIds) {
					expect(getSymbolById(symbolId)).toBeDefined()
					expect(set.has(symbolId)).toBe(false)
					set.add(symbolId)
				}
			}
		}
	})
})
