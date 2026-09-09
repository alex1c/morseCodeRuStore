/**
 * Morse encode / decode — structured API for UI, audio, and lessons.
 */

import {
	lookupSymbolForDecode,
	lookupSymbolForEncode,
} from './alphabets'
import { sequenceToPattern } from './elements'
import { normalizeText } from './normalize'
import type { AlphabetContext, MorseElement, MorseSymbol } from './types'

export type EncodedSymbol =
	| {
			kind: 'symbol'
			character: string
			symbol: MorseSymbol
			code: MorseElement[]
			pattern: string
	  }
	| {
			kind: 'unsupported'
			character: string
	  }
	| {
			kind: 'word-space'
	  }

export type EncodeTextResult = {
	normalizedText: string
	tokens: EncodedSymbol[]
	unsupportedCharacters: string[]
}

export type EncodeTextOptions = {
	/** Skip normalizeText when caller already normalized. */
	alreadyNormalized?: boolean
}

/**
 * Encode plain text into structured Morse tokens for a alphabet context.
 */
export function encodeText (
	text: string,
	alphabet: AlphabetContext,
	options: EncodeTextOptions = {},
): EncodeTextResult {
	const normalized = options.alreadyNormalized
		? text
		: normalizeText(text).normalized

	const tokens: EncodedSymbol[] = []
	const unsupportedCharacters: string[] = []

	for (const character of normalized) {
		if (character === ' ') {
			tokens.push({ kind: 'word-space' })
			continue
		}
		const symbol = lookupSymbolForEncode(character, alphabet)
		if (!symbol) {
			tokens.push({ kind: 'unsupported', character })
			unsupportedCharacters.push(character)
			continue
		}
		tokens.push({
			kind: 'symbol',
			character,
			symbol,
			code: symbol.code,
			pattern: sequenceToPattern(symbol.code),
		})
	}

	return {
		normalizedText: normalized,
		tokens,
		unsupportedCharacters,
	}
}

/**
 * Human-readable presentation helper (not the internal format).
 * Example: encodeTextToPatternString('SOS', 'LATIN') → '... --- ...'
 * Words separated by " / ".
 */
export function encodeTextToPatternString (
	text: string,
	alphabet: AlphabetContext,
): string {
	const { tokens } = encodeText(text, alphabet)
	const words: string[] = []
	let current: string[] = []

	const flush = () => {
		if (current.length > 0) {
			words.push(current.join(' '))
			current = []
		}
	}

	for (const token of tokens) {
		if (token.kind === 'word-space') {
			flush()
		} else if (token.kind === 'symbol') {
			current.push(token.pattern)
		} else {
			current.push('?')
		}
	}
	flush()
	return words.join(' / ')
}

export type DecodedToken =
	| {
			kind: 'symbol'
			pattern: string
			character: string
			symbol: MorseSymbol
	  }
	| {
			kind: 'unknown'
			pattern: string
	  }
	| {
			kind: 'word-space'
	  }

export type DecodeMorseResult = {
	tokens: DecodedToken[]
	text: string
	unknownPatterns: string[]
}

export type DecodeMorseOptions = {
	/**
	 * Primary alphabet for pattern → character resolution.
	 * Required when learner context is BOTH (no silent global map).
	 */
	primary: 'RU' | 'LATIN'
	/**
	 * Letter separator in textual Morse (default: one or more spaces).
	 */
	letterSeparator?: RegExp
	/**
	 * Word separator token (default "/").
	 */
	wordSeparator?: string
}

/**
 * Decode a textual Morse string (letters spaced, words via "/").
 * Timing parsing is intentionally separate from this API.
 */
export function decodeMorseText (
	morseText: string,
	options: DecodeMorseOptions,
): DecodeMorseResult {
	const wordSeparator = options.wordSeparator ?? '/'
	const trimmed = morseText.trim()
	const tokens: DecodedToken[] = []
	const unknownPatterns: string[] = []
	let text = ''

	if (!trimmed) {
		return { tokens, text, unknownPatterns }
	}

	const wordChunks = trimmed.split(wordSeparator)

	wordChunks.forEach((chunk, wordIndex) => {
		if (wordIndex > 0) {
			tokens.push({ kind: 'word-space' })
			text += ' '
		}
		const patterns = chunk
			.trim()
			.split(/\s+/)
			.filter(Boolean)
		for (const pattern of patterns) {
			const symbol = lookupSymbolForDecode(pattern, options.primary)
			if (!symbol) {
				tokens.push({ kind: 'unknown', pattern })
				unknownPatterns.push(pattern)
				text += '?'
				continue
			}
			tokens.push({
				kind: 'symbol',
				pattern,
				character: symbol.character,
				symbol,
			})
			text += symbol.character
		}
	})

	return { tokens, text, unknownPatterns }
}

/**
 * Decode a structured list of letter patterns with explicit word breaks.
 */
export function decodePatternWords (
	words: string[][],
	primary: 'RU' | 'LATIN',
): DecodeMorseResult {
	const tokens: DecodedToken[] = []
	const unknownPatterns: string[] = []
	let text = ''

	words.forEach((word, wordIndex) => {
		if (wordIndex > 0) {
			tokens.push({ kind: 'word-space' })
			text += ' '
		}
		for (const pattern of word) {
			const symbol = lookupSymbolForDecode(pattern, primary)
			if (!symbol) {
				tokens.push({ kind: 'unknown', pattern })
				unknownPatterns.push(pattern)
				text += '?'
				continue
			}
			tokens.push({
				kind: 'symbol',
				pattern,
				character: symbol.character,
				symbol,
			})
			text += symbol.character
		}
	})

	return { tokens, text, unknownPatterns }
}
