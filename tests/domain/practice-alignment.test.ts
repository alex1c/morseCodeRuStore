/**
 * Levenshtein alignment for multi-char listening answers.
 */

import { alignListeningAnswer } from '@/src/domain/practice-content'

describe('alignListeningAnswer', () => {
	test('exact match ДОМ', () => {
		const result = alignListeningAnswer('ДОМ', 'ДОМ')
		expect(result.itemCorrect).toBe(true)
		expect(result.matches).toBe(3)
		expect(result.substitutions).toBe(0)
		expect(result.missings).toBe(0)
		expect(result.extras).toBe(0)
		expect(result.characterAccuracy).toBe(1)
		expect(result.steps.every((s) => s.operation === 'match')).toBe(true)
	})

	test('one substitution ДОМ vs ДАМ', () => {
		const result = alignListeningAnswer('ДОМ', 'ДАМ')
		expect(result.itemCorrect).toBe(false)
		expect(result.substitutions).toBe(1)
		expect(result.matches).toBe(2)
		expect(result.characterAccuracy).toBeCloseTo(2 / 3)
		const sub = result.steps.find((s) => s.operation === 'substitution')
		expect(sub?.targetChar).toBe('О')
		expect(sub?.answerChar).toBe('А')
	})

	test('deletion РАДИО vs РДИО does not cascade', () => {
		const result = alignListeningAnswer('РАДИО', 'РДИО')
		expect(result.itemCorrect).toBe(false)
		expect(result.missings).toBe(1)
		expect(result.matches).toBe(4)
		expect(result.substitutions).toBe(0)
		expect(result.characterAccuracy).toBeCloseTo(4 / 5)
		const missing = result.steps.find((s) => s.operation === 'missing')
		expect(missing?.targetChar).toBe('А')
		// Remaining letters aligned as matches, not cascade substitutions.
		const matched = result.steps
			.filter((s) => s.operation === 'match')
			.map((s) => s.targetChar)
		expect(matched).toEqual(['Р', 'Д', 'И', 'О'])
	})

	test('insertion ДОМ vs ДООМ', () => {
		const result = alignListeningAnswer('ДОМ', 'ДООМ')
		expect(result.extras).toBe(1)
		expect(result.matches).toBe(3)
		expect(result.substitutions).toBe(0)
		expect(result.missings).toBe(0)
	})

	test('first missing ДОМ vs ОМ', () => {
		const result = alignListeningAnswer('ДОМ', 'ОМ')
		expect(result.missings).toBe(1)
		expect(result.matches).toBe(2)
		expect(result.steps[0]?.operation).toBe('missing')
		expect(result.steps[0]?.targetChar).toBe('Д')
	})

	test('last missing ДОМ vs ДО', () => {
		const result = alignListeningAnswer('ДОМ', 'ДО')
		expect(result.missings).toBe(1)
		expect(result.matches).toBe(2)
		expect(result.steps[result.steps.length - 1]?.operation).toBe('missing')
		expect(result.steps[result.steps.length - 1]?.targetChar).toBe('М')
	})

	test('empty answer → all missing', () => {
		const result = alignListeningAnswer('ДОМ', '')
		expect(result.missings).toBe(3)
		expect(result.matches).toBe(0)
		expect(result.characterAccuracy).toBe(0)
		expect(result.itemCorrect).toBe(false)
	})

	test('normalizes case and whitespace', () => {
		const result = alignListeningAnswer('  дом  ', 'дом')
		expect(result.itemCorrect).toBe(true)
	})
})
