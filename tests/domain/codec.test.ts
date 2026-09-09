/**
 * Normalize / encode / decode tests.
 */

import {
	decodeMorseText,
	encodeText,
	encodeTextToPatternString,
	normalizeText,
} from '@/src/domain/morse'

describe('normalizeText', () => {
	test('uppercases Latin and Cyrillic and preserves Ё', () => {
		expect(normalizeText('привет').normalized).toBe('ПРИВЕТ')
		expect(normalizeText('sos').normalized).toBe('SOS')
		expect(normalizeText('ёлка').normalized).toBe('ЁЛКА')
	})

	test('keeps punctuation and collapses spaces', () => {
		expect(normalizeText('да,  мир?').normalized).toBe('ДА, МИР?')
	})

	test('does not transliterate scripts', () => {
		expect(normalizeText('AБ').normalized).toBe('AБ')
	})
})

describe('encodeText', () => {
	test('encodes SOS', () => {
		expect(encodeTextToPatternString('SOS', 'LATIN')).toBe('... --- ...')
		const result = encodeText('SOS', 'LATIN')
		expect(result.unsupportedCharacters).toEqual([])
		expect(result.tokens.filter((t) => t.kind === 'symbol')).toHaveLength(3)
	})

	test('encodes Russian ПРИВЕТ', () => {
		// П .--. / Р .-. / И .. / В .-- / Е . / Т -
		expect(encodeTextToPatternString('привет', 'RU')).toBe(
			'.--. .-. .. .-- . -',
		)
	})

	test('encodes Ё as Е code and reports unsupported Latin in RU mode', () => {
		const yo = encodeText('Ё', 'RU')
		expect(yo.tokens[0]).toMatchObject({ kind: 'symbol', pattern: '.' })
		const mixed = encodeText('АA', 'RU')
		expect(mixed.unsupportedCharacters).toEqual(['A'])
	})

	test('word spaces become structured tokens', () => {
		const result = encodeText('СОС SOS', 'BOTH')
		expect(result.tokens.some((t) => t.kind === 'word-space')).toBe(true)
		expect(encodeTextToPatternString('СОС SOS', 'BOTH')).toContain(' / ')
	})
})

describe('decodeMorseText', () => {
	test('decodes LATIN SOS', () => {
		const result = decodeMorseText('... --- ...', { primary: 'LATIN' })
		expect(result.text).toBe('SOS')
		expect(result.unknownPatterns).toEqual([])
	})

	test('decodes RU sequence', () => {
		const result = decodeMorseText('.--. .-. .. .-- . -', {
			primary: 'RU',
		})
		expect(result.text).toBe('ПРИВЕТ')
	})

	test('supports word separation with /', () => {
		const result = decodeMorseText('... --- ... / -', {
			primary: 'LATIN',
		})
		expect(result.text).toBe('SOS T')
	})

	test('returns controlled unknown for invalid patterns', () => {
		const result = decodeMorseText('......-.-', { primary: 'LATIN' })
		expect(result.unknownPatterns).toEqual(['......-.-'])
		expect(result.text).toBe('?')
	})
})
