/**
 * Per-symbol stats derived from word alignment (no cascade / no fake extras).
 */

import {
	alignListeningAnswer,
	symbolAttemptsFromAlignment,
} from '@/src/domain/practice-content'

describe('symbolAttemptsFromAlignment', () => {
	test('exact word → every target symbol correct once', () => {
		const alignment = alignListeningAnswer('ДОМ', 'ДОМ')
		const attempts = symbolAttemptsFromAlignment(alignment, 'RU')
		expect(attempts).toHaveLength(3)
		expect(attempts.every((a) => a.isCorrect)).toBe(true)
		expect(attempts.map((a) => a.expectedSymbolId)).toEqual([
			'ru-d',
			'ru-o',
			'ru-m',
		])
	})

	test('substitution → incorrect + confusion pair', () => {
		const alignment = alignListeningAnswer('ДОМ', 'ДАМ')
		const attempts = symbolAttemptsFromAlignment(alignment, 'RU')
		expect(attempts).toHaveLength(3)
		const mid = attempts[1]
		expect(mid.expectedSymbolId).toBe('ru-o')
		expect(mid.isCorrect).toBe(false)
		expect(mid.answerSymbolId).toBe('ru-a')
		expect(attempts[0].isCorrect).toBe(true)
		expect(attempts[2].isCorrect).toBe(true)
	})

	test('deletion → missing target incorrect; no cascade', () => {
		const alignment = alignListeningAnswer('РАДИО', 'РДИО')
		const attempts = symbolAttemptsFromAlignment(alignment, 'RU')
		expect(attempts).toHaveLength(5)
		const missing = attempts.find((a) => !a.isCorrect)
		expect(missing?.expectedSymbolId).toBe('ru-a')
		expect(missing?.answerSymbolId).toBeNull()
		expect(attempts.filter((a) => a.isCorrect)).toHaveLength(4)
	})

	test('insertion → no fake target attempt', () => {
		const alignment = alignListeningAnswer('ДОМ', 'ДООМ')
		const attempts = symbolAttemptsFromAlignment(alignment, 'RU')
		expect(attempts).toHaveLength(3)
		expect(attempts.every((a) => a.isCorrect)).toBe(true)
	})

	test('no duplicate attempts for one target letter', () => {
		const alignment = alignListeningAnswer('МИР', 'МММ')
		const attempts = symbolAttemptsFromAlignment(alignment, 'RU')
		const counts = new Map<string, number>()
		for (const attempt of attempts) {
			counts.set(
				attempt.expectedSymbolId,
				(counts.get(attempt.expectedSymbolId) ?? 0) + 1,
			)
		}
		for (const count of counts.values()) {
			expect(count).toBe(1)
		}
	})
})
