/**
 * Normalize keyboard answers for Receive mode.
 */

import { getSymbolById, normalizeText } from '@/src/domain'
import type { ReceiveAlphabet } from './types'

/**
 * Normalize typed input to a single uppercase symbol character.
 * Trims whitespace; rejects empty / multi-character answers.
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
