/**
 * Translator helpers — Morse input normalization and encode/decode wrappers.
 * Uses canonical codec only (no parallel code tables).
 */

import {
	decodeMorseText,
	encodeText,
	encodeTextToPatternString,
	normalizeText,
	sequenceToPattern,
	type AlphabetContext,
} from '@/src/domain/morse'

export type TranslatorAlphabet = 'RU' | 'LATIN'
export type TranslatorDirection = 'text-to-morse' | 'morse-to-text'

/**
 * Normalize pasted Morse: Unicode dots/dashes → ASCII, collapse whitespace.
 * Letters/digits are stripped — only Morse syntax remains.
 */
export function normalizeMorseInput (raw: string): string {
	const mapped = raw
		.replace(/[·•∙⋅]/g, '.')
		.replace(/[—–−‒]/g, '-')
		.replace(/\u00a0/g, ' ')
	let kept = ''
	for (const ch of mapped) {
		if (ch === '.' || ch === '-' || ch === '/' || /\s/.test(ch)) {
			kept += ch
		}
	}
	return kept
		.replace(/[ \t]+/g, ' ')
		.replace(/\s*\/\s*/g, ' / ')
		.trim()
}

export type TextToMorseResult = {
	morse: string
	unsupported: string[]
	normalizedText: string
}

export function translateTextToMorse (
	raw: string,
	alphabet: TranslatorAlphabet,
): TextToMorseResult {
	const { normalized } = normalizeText(raw)
	const encoded = encodeText(normalized, alphabet as AlphabetContext)
	const unsupported = [...new Set(encoded.unsupportedCharacters)]
	return {
		morse: encodeTextToPatternString(normalized, alphabet),
		unsupported,
		normalizedText: encoded.normalizedText,
	}
}

export type MorseToTextResult = {
	text: string
	unknownPatterns: string[]
	normalizedMorse: string
}

export function translateMorseToText (
	raw: string,
	alphabet: TranslatorAlphabet,
): MorseToTextResult {
	const normalizedMorse = normalizeMorseInput(raw)
	const decoded = decodeMorseText(normalizedMorse, { primary: alphabet })
	return {
		text: decoded.text,
		unknownPatterns: [...new Set(decoded.unknownPatterns)],
		normalizedMorse,
	}
}

/** Accessibility label for Morse pattern: "точка тире". */
export function describeMorsePattern (pattern: string): string {
	return pattern
		.split('')
		.map((ch) => {
			if (ch === '.') {
				return 'точка'
			}
			if (ch === '-') {
				return 'тире'
			}
			return ch
		})
		.join(' ')
}

export function describeMorseCode (
	code: import('@/src/domain/morse').MorseElement[],
): string {
	return describeMorsePattern(sequenceToPattern(code))
}

/** Per-character breakdown for short text (cap applies in UI). */
export function buildSymbolBreakdown (
	text: string,
	alphabet: TranslatorAlphabet,
): { character: string; pattern: string }[] {
	const encoded = encodeText(text, alphabet)
	const rows: { character: string; pattern: string }[] = []
	for (const token of encoded.tokens) {
		if (token.kind === 'symbol') {
			rows.push({
				character: token.character,
				pattern: token.pattern,
			})
		}
	}
	return rows
}
