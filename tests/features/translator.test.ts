/**
 * Translator encode/decode helpers.
 */

import {
	normalizeMorseInput,
	translateMorseToText,
	translateTextToMorse,
} from '@/src/features/translator'

describe('translator helpers', () => {
	test('LATIN SOS text → Morse', () => {
		const result = translateTextToMorse('SOS', 'LATIN')
		expect(result.morse).toBe('... --- ...')
		expect(result.unsupported).toEqual([])
	})

	test('Russian simple text', () => {
		const result = translateTextToMorse('ДОМ', 'RU')
		expect(result.morse.split(' ').length).toBe(3)
		expect(result.unsupported).toEqual([])
	})

	test('digits and punctuation and spaces', () => {
		const result = translateTextToMorse('A 1?', 'LATIN')
		expect(result.morse).toContain('.')
		expect(result.morse).toContain('/')
		expect(result.unsupported).toEqual([])
	})

	test('unsupported characters reported without crash', () => {
		const result = translateTextToMorse('HI@#', 'LATIN')
		expect(result.unsupported).toEqual(expect.arrayContaining(['@', '#']))
		expect(result.morse.includes('?') || result.morse.length > 0).toBe(true)
	})

	test('Morse → LATIN SOS', () => {
		const result = translateMorseToText('... --- ...', 'LATIN')
		expect(result.text).toBe('SOS')
		expect(result.unknownPatterns).toEqual([])
	})

	test('Morse → RU with word separator', () => {
		const result = translateMorseToText('.- / -', 'RU')
		expect(result.text).toBe('А Т')
	})

	test('Unicode dots/dashes normalize', () => {
		// En-dash / bullet forms map to ASCII Morse.
		expect(normalizeMorseInput('··· ––··')).toBe('... --..')
		expect(normalizeMorseInput('·—·')).toBe('.-.')
		const result = translateMorseToText('··· --- ···', 'LATIN')
		expect(result.text).toBe('SOS')
	})

	test('invalid token → unknown marker', () => {
		const result = translateMorseToText('......', 'LATIN')
		expect(result.unknownPatterns.length).toBeGreaterThan(0)
		expect(result.text).toContain('?')
	})

	test('same pattern decodes differently RU vs LATIN', () => {
		// `.--` is В in RU and W in LATIN
		const ru = translateMorseToText('.--', 'RU')
		const latin = translateMorseToText('.--', 'LATIN')
		expect(ru.text).toBe('В')
		expect(latin.text).toBe('W')
		expect(ru.text).not.toBe(latin.text)
	})
})
