/**
 * Catalog integrity and known-symbol checks.
 */

import {
	findCrossAlphabetPatternCollisions,
	listDigits,
	listLatinLetters,
	listPunctuation,
	listRussianLetters,
	lookupSymbolForDecode,
	lookupSymbolForEncode,
	sequenceToPattern,
	validateCatalogIntegrity,
} from '@/src/domain/morse'

describe('morse catalog', () => {
	test('has no integrity issues', () => {
		expect(validateCatalogIntegrity()).toEqual([])
	})

	test('includes full Latin A–Z', () => {
		const letters = listLatinLetters()
		expect(letters).toHaveLength(26)
		expect(letters.map((s) => s.character).join('')).toBe(
			'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		)
		expect(sequenceToPattern(
			lookupSymbolForEncode('S', 'LATIN')!.code,
		)).toBe('...')
		expect(sequenceToPattern(
			lookupSymbolForEncode('O', 'LATIN')!.code,
		)).toBe('---')
	})

	test('includes Russian letters including Ё alias', () => {
		const letters = listRussianLetters()
		expect(letters).toHaveLength(33)
		expect(lookupSymbolForEncode('Ж', 'RU')!.id).toBe('ru-zh')
		expect(sequenceToPattern(
			lookupSymbolForEncode('Ж', 'RU')!.code,
		)).toBe('...-')
		expect(sequenceToPattern(
			lookupSymbolForEncode('Ё', 'RU')!.code,
		)).toBe('.')
		expect(lookupSymbolForDecode('.', 'RU')!.character).toBe('Е')
		expect(sequenceToPattern(
			lookupSymbolForEncode('Ъ', 'RU')!.code,
		)).toBe('--.--')
		expect(sequenceToPattern(
			lookupSymbolForEncode('Ь', 'RU')!.code,
		)).toBe('-..-')
	})

	test('includes digits 0–9', () => {
		expect(listDigits()).toHaveLength(10)
		expect(sequenceToPattern(
			lookupSymbolForEncode('5', 'LATIN')!.code,
		)).toBe('.....')
	})

	test('includes required punctuation', () => {
		const chars = listPunctuation().map((s) => s.character)
		for (const required of ['.', ',', '?', '/', '=', '+', '-', '(', ')', ':', "'", '"']) {
			expect(chars).toContain(required)
		}
	})

	test('decode is alphabet-context sensitive for shared patterns', () => {
		expect(lookupSymbolForDecode('.-', 'RU')!.character).toBe('А')
		expect(lookupSymbolForDecode('.-', 'LATIN')!.character).toBe('A')
		expect(lookupSymbolForDecode('-..-', 'RU')!.character).toBe('Ь')
		expect(lookupSymbolForDecode('-..-', 'LATIN')!.character).toBe('X')
		expect(findCrossAlphabetPatternCollisions().length).toBeGreaterThan(0)
	})

	test('does not silently transliterate Latin in RU context', () => {
		expect(lookupSymbolForEncode('A', 'RU')).toBeUndefined()
		expect(lookupSymbolForEncode('А', 'LATIN')).toBeUndefined()
	})
})
