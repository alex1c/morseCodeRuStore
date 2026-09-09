/**
 * Keyboard answer normalization for Receive.
 */

import {
	normalizeKeyboardAnswer,
	normalizeTextAnswer,
	resolveKeyboardAnswerSymbolId,
} from '@/src/features/receive'

describe('receive keyboard normalization', () => {
	test('uppercases latin and ignores whitespace', () => {
		expect(normalizeKeyboardAnswer('  a  ', 'LATIN')).toBe('A')
		expect(normalizeKeyboardAnswer('b', 'LATIN')).toBe('B')
	})

	test('handles russian unicode', () => {
		expect(normalizeKeyboardAnswer('а', 'RU')).toBe('А')
		expect(normalizeKeyboardAnswer('ё', 'RU')).toBe('Ё')
	})

	test('normalizeTextAnswer collapses spaces and maps Ё→Е', () => {
		expect(normalizeTextAnswer('  при  вет  ', 'RU', { allowSpaces: true })).toBe('ПРИ ВЕТ')
		expect(normalizeTextAnswer('ёлка', 'RU')).toBe('ЕЛКА')
		expect(normalizeTextAnswer('hello', 'RU')).toBeNull()
		expect(normalizeTextAnswer('ПРИВЕТ', 'LATIN')).toBeNull()
		expect(normalizeTextAnswer('12 34', 'RU', { allowDigits: true, allowSpaces: true })).toBe('12 34')
	})

	test('rejects wrong script and multi-char', () => {
		expect(normalizeKeyboardAnswer('A', 'RU')).toBeNull()
		expect(normalizeKeyboardAnswer('А', 'LATIN')).toBeNull()
		expect(normalizeKeyboardAnswer('АБ', 'RU')).toBeNull()
		expect(normalizeKeyboardAnswer('   ', 'RU')).toBeNull()
	})

	test('resolves symbol id from pool', () => {
		const ok = resolveKeyboardAnswerSymbolId('т', 'RU', [
			'ru-a',
			'ru-t',
			'ru-n',
		])
		expect(ok.symbolId).toBe('ru-t')
		const wrong = resolveKeyboardAnswerSymbolId('ж', 'RU', [
			'ru-a',
			'ru-t',
		])
		expect(wrong.symbolId).toBeNull()
		expect(wrong.character).toBe('Ж')
	})
})
