/**
 * Normalize keyboard answers for Receive mode.
 */

import {
	alignListeningAnswer,
	getSymbolById,
	normalizeText,
	type AlignmentResult,
} from '@/src/domain'
import type { ReceiveAlphabet } from './types'

/**
 * Normalize typed input to a single uppercase symbol character.
 * Trims whitespace; rejects empty / multi-character answers.
 * Keeps Ё as Ё for single-symbol mode (existing tests / catalog).
 */
export function normalizeKeyboardAnswer (
	raw: string,
	alphabet: ReceiveAlphabet,
): string | null {
	const trimmed = raw.trim()
	if (!trimmed) {
		return null
	}
	const normalized = normalizeText(trimmed).normalized
	if (normalized.length !== 1) {
		return null
	}
	const char = normalized
	if (alphabet === 'LATIN') {
		if (char < 'A' || char > 'Z') {
			return null
		}
		return char
	}
	// RU: accept Cyrillic letters (Ё included via normalizeText)
	if (!/[А-ЯЁ]/.test(char)) {
		return null
	}
	return char
}

/**
 * Resolve typed character to a catalog symbol id in the given alphabet.
 */
export function resolveKeyboardAnswerSymbolId (
	raw: string,
	alphabet: ReceiveAlphabet,
	allowedPool: string[],
): { symbolId: string | null; character: string | null } {
	const character = normalizeKeyboardAnswer(raw, alphabet)
	if (!character) {
		return { symbolId: null, character: null }
	}
	const match = allowedPool
		.map((id) => getSymbolById(id))
		.find((symbol) => symbol?.character === character)
	return {
		symbolId: match?.id ?? null,
		character,
	}
}

export type NormalizeTextAnswerOptions = {
	allowDigits?: boolean
	allowSpaces?: boolean
}

/**
 * Normalize a multi-character listening answer.
 * Uppercase, trim, collapse spaces; Ё→Е for RU; no transliteration.
 * Rejects Latin letters in RU mode and Cyrillic in LATIN mode.
 */
export function normalizeTextAnswer (
	raw: string,
	alphabet: ReceiveAlphabet,
	options: NormalizeTextAnswerOptions = {},
): string | null {
	const allowDigits = options.allowDigits === true
	const allowSpaces = options.allowSpaces === true

	let text = raw.replace(/\s+/g, ' ').trim().toUpperCase()
	if (!text) {
		return null
	}
	if (alphabet === 'RU') {
		text = text.replace(/Ё/g, 'Е')
	}
	if (!allowSpaces && /\s/.test(text)) {
		return null
	}

	for (const ch of text) {
		if (ch === ' ') {
			continue
		}
		if (ch >= '0' && ch <= '9') {
			if (!allowDigits) {
				return null
			}
			continue
		}
		if (alphabet === 'LATIN') {
			if (ch < 'A' || ch > 'Z') {
				return null
			}
			continue
		}
		// RU letters only (Ё already mapped to Е)
		if (!/[А-Я]/.test(ch)) {
			return null
		}
	}
	return text
}

/**
 * Evaluate a multi-char answer via sequence alignment.
 */
export function evaluateTextAnswer (
	target: string,
	answer: string,
	alphabet: ReceiveAlphabet,
	allowDigits: boolean,
): { alignment: AlignmentResult; itemCorrect: boolean; normalizedAnswer: string | null } {
	const allowSpaces = /\s/.test(target)
	const normalizedAnswer = normalizeTextAnswer(answer, alphabet, {
		allowDigits,
		allowSpaces,
	})
	const normalizedTarget = normalizeTextAnswer(target, alphabet, {
		allowDigits,
		allowSpaces: true,
	}) ?? target.replace(/\s+/g, ' ').trim().toUpperCase().replace(/Ё/g, 'Е')

	if (normalizedAnswer == null) {
		const alignment = alignListeningAnswer(normalizedTarget, '')
		return {
			alignment,
			itemCorrect: false,
			normalizedAnswer: null,
		}
	}

	const alignment = alignListeningAnswer(normalizedTarget, normalizedAnswer)
	return {
		alignment,
		itemCorrect: alignment.itemCorrect,
		normalizedAnswer,
	}
}
