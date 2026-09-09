/**
 * Phase 1 helper + theme smoke tests (kept after engine expansion).
 */

import {
	applyAttemptToStats,
	calculateAccuracyPercent,
	getSampleSymbolById,
	getSampleSymbolsForLesson,
	patternToSequence,
	SAMPLE_MORSE_SYMBOLS,
	sequenceToPattern,
} from '@/src/domain/morse'
import { createEmptySymbolStats } from '@/src/types'
import { resolveColorScheme } from '@/src/theme/ThemeProvider'

describe('morse domain helpers', () => {
	test('encodes and parses Morse sequences', () => {
		const pattern = sequenceToPattern(['dot', 'dash', 'dot', 'dot'])
		expect(pattern).toBe('.-..')
		expect(patternToSequence(pattern)).toEqual([
			'dot',
			'dash',
			'dot',
			'dot',
		])
	})

	test('calculates accuracy percent safely', () => {
		expect(calculateAccuracyPercent(0, 0)).toBe(0)
		expect(calculateAccuracyPercent(1, 2)).toBe(50)
		expect(calculateAccuracyPercent(3, 4)).toBe(75)
	})

	test('tracks confusion pairs like Ж → Ф', () => {
		const zh = createEmptySymbolStats('ru-zh')
		const afterWrong = applyAttemptToStats(zh, {
			isCorrect: false,
			responseTimeMs: 900,
			practicedAt: '2026-09-09T12:00:00.000Z',
			answerSymbolId: 'ru-f',
		})
		expect(afterWrong.incorrect).toBe(1)
		expect(afterWrong.confusionMap['ru-f']).toBe(1)
	})

	test('sample catalog supports lesson membership', () => {
		expect(SAMPLE_MORSE_SYMBOLS.length).toBeGreaterThan(0)
		const lesson1 = getSampleSymbolsForLesson('lesson-1')
		expect(lesson1.some((s) => s.id === 'ru-a')).toBe(true)
		expect(getSampleSymbolById('ru-zh')?.character).toBe('Ж')
	})
})

describe('theme resolution', () => {
	test('respects explicit preference over system', () => {
		expect(resolveColorScheme('dark', 'light')).toBe('dark')
		expect(resolveColorScheme('light', 'dark')).toBe('light')
		expect(resolveColorScheme('system', 'dark')).toBe('dark')
		expect(resolveColorScheme('system', 'light')).toBe('light')
	})
})
