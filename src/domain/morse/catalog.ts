/**
 * Production Morse catalog — Latin, Russian, digits, core punctuation.
 * Codes are defined once here; UI and audio must not invent parallel tables.
 *
 * Russian references: traditional Russian telegraph Morse (aligned with
 * International Morse where phonetically matched). Contested letters are
 * documented in docs/morse-reference.md.
 */

import { patternToSequence } from './elements'
import type { MorseCategory, MorseElement, MorseSymbol } from './types'

type CatalogDraft = {
	id: string
	character: string
	pattern: string
	family: MorseSymbol['family']
	category: MorseCategory
	learningOrder: number
	enabled?: boolean
	visualMnemonicId?: string | null
	decodeAliasOfId?: string
}

function draftToSymbol (draft: CatalogDraft): MorseSymbol {
	const code: MorseElement[] = patternToSequence(draft.pattern)
	if (code.length === 0) {
		throw new Error(`Empty Morse code for ${draft.id}`)
	}
	return {
		id: draft.id,
		character: draft.character,
		code,
		family: draft.family,
		category: draft.category,
		learningOrder: draft.learningOrder,
		enabled: draft.enabled ?? true,
		visualMnemonicId: draft.visualMnemonicId ?? null,
		decodeAliasOfId: draft.decodeAliasOfId,
	}
}

/** International Latin A–Z (ITU-R M.1677-1). */
const LATIN_DRAFTS: CatalogDraft[] = [
	{ id: 'latin-a', character: 'A', pattern: '.-', family: 'LATIN', category: 'letter', learningOrder: 1, visualMnemonicId: 'latin-a-card' },
	{ id: 'latin-b', character: 'B', pattern: '-...', family: 'LATIN', category: 'letter', learningOrder: 2 },
	{ id: 'latin-c', character: 'C', pattern: '-.-.', family: 'LATIN', category: 'letter', learningOrder: 3 },
	{ id: 'latin-d', character: 'D', pattern: '-..', family: 'LATIN', category: 'letter', learningOrder: 4, visualMnemonicId: 'latin-d-card' },
	{ id: 'latin-e', character: 'E', pattern: '.', family: 'LATIN', category: 'letter', learningOrder: 5, visualMnemonicId: 'latin-e-card' },
	{ id: 'latin-f', character: 'F', pattern: '..-.', family: 'LATIN', category: 'letter', learningOrder: 6 },
	{ id: 'latin-g', character: 'G', pattern: '--.', family: 'LATIN', category: 'letter', learningOrder: 7 },
	{ id: 'latin-h', character: 'H', pattern: '....', family: 'LATIN', category: 'letter', learningOrder: 8 },
	{ id: 'latin-i', character: 'I', pattern: '..', family: 'LATIN', category: 'letter', learningOrder: 9, visualMnemonicId: 'latin-i-card' },
	{ id: 'latin-j', character: 'J', pattern: '.---', family: 'LATIN', category: 'letter', learningOrder: 10 },
	{ id: 'latin-k', character: 'K', pattern: '-.-', family: 'LATIN', category: 'letter', learningOrder: 11, visualMnemonicId: 'latin-k-card' },
	{ id: 'latin-l', character: 'L', pattern: '.-..', family: 'LATIN', category: 'letter', learningOrder: 12 },
	{ id: 'latin-m', character: 'M', pattern: '--', family: 'LATIN', category: 'letter', learningOrder: 13, visualMnemonicId: 'latin-m-card' },
	{ id: 'latin-n', character: 'N', pattern: '-.', family: 'LATIN', category: 'letter', learningOrder: 14, visualMnemonicId: 'latin-n-card' },
	{ id: 'latin-o', character: 'O', pattern: '---', family: 'LATIN', category: 'letter', learningOrder: 15, visualMnemonicId: 'latin-o-card' },
	{ id: 'latin-p', character: 'P', pattern: '.--.', family: 'LATIN', category: 'letter', learningOrder: 16 },
	{ id: 'latin-q', character: 'Q', pattern: '--.-', family: 'LATIN', category: 'letter', learningOrder: 17 },
	{ id: 'latin-r', character: 'R', pattern: '.-.', family: 'LATIN', category: 'letter', learningOrder: 18, visualMnemonicId: 'latin-r-card' },
	{ id: 'latin-s', character: 'S', pattern: '...', family: 'LATIN', category: 'letter', learningOrder: 19, visualMnemonicId: 'latin-s-card' },
	{ id: 'latin-t', character: 'T', pattern: '-', family: 'LATIN', category: 'letter', learningOrder: 20, visualMnemonicId: 'latin-t-card' },
	{ id: 'latin-u', character: 'U', pattern: '..-', family: 'LATIN', category: 'letter', learningOrder: 21, visualMnemonicId: 'latin-u-card' },
	{ id: 'latin-v', character: 'V', pattern: '...-', family: 'LATIN', category: 'letter', learningOrder: 22 },
	{ id: 'latin-w', character: 'W', pattern: '.--', family: 'LATIN', category: 'letter', learningOrder: 23 },
	{ id: 'latin-x', character: 'X', pattern: '-..-', family: 'LATIN', category: 'letter', learningOrder: 24 },
	{ id: 'latin-y', character: 'Y', pattern: '-.--', family: 'LATIN', category: 'letter', learningOrder: 25 },
	{ id: 'latin-z', character: 'Z', pattern: '--..', family: 'LATIN', category: 'letter', learningOrder: 26 },
]

/**
 * Russian telegraph Morse (33 letters).
 * Ё shares Е's code; decode prefers Е (see docs/morse-reference.md).
 * Ъ uses --.-- (common modern training tables).
 * Ь uses -..- (same pattern as Latin X — context-sensitive decode).
 */
const RUSSIAN_DRAFTS: CatalogDraft[] = [
	{ id: 'ru-a', character: 'А', pattern: '.-', family: 'RU', category: 'letter', learningOrder: 1, visualMnemonicId: 'ru-a-card' },
	{ id: 'ru-b', character: 'Б', pattern: '-...', family: 'RU', category: 'letter', learningOrder: 2, visualMnemonicId: 'ru-b-card' },
	{ id: 'ru-v', character: 'В', pattern: '.--', family: 'RU', category: 'letter', learningOrder: 3, visualMnemonicId: 'ru-v-card' },
	{ id: 'ru-g', character: 'Г', pattern: '--.', family: 'RU', category: 'letter', learningOrder: 4, visualMnemonicId: 'ru-g-card' },
	{ id: 'ru-d', character: 'Д', pattern: '-..', family: 'RU', category: 'letter', learningOrder: 5, visualMnemonicId: 'ru-d-card' },
	{ id: 'ru-e', character: 'Е', pattern: '.', family: 'RU', category: 'letter', learningOrder: 6, visualMnemonicId: 'ru-e-card' },
	{
		id: 'ru-yo',
		character: 'Ё',
		pattern: '.',
		family: 'RU',
		category: 'letter',
		learningOrder: 7,
		decodeAliasOfId: 'ru-e',
	},
	{ id: 'ru-zh', character: 'Ж', pattern: '...-', family: 'RU', category: 'letter', learningOrder: 8, visualMnemonicId: 'ru-zh-card' },
	{ id: 'ru-z', character: 'З', pattern: '--..', family: 'RU', category: 'letter', learningOrder: 9, visualMnemonicId: 'ru-z-card' },
	{ id: 'ru-i', character: 'И', pattern: '..', family: 'RU', category: 'letter', learningOrder: 10, visualMnemonicId: 'ru-i-card' },
	{ id: 'ru-j', character: 'Й', pattern: '.---', family: 'RU', category: 'letter', learningOrder: 11, visualMnemonicId: 'ru-j-card' },
	{ id: 'ru-k', character: 'К', pattern: '-.-', family: 'RU', category: 'letter', learningOrder: 12, visualMnemonicId: 'ru-k-card' },
	{ id: 'ru-l', character: 'Л', pattern: '.-..', family: 'RU', category: 'letter', learningOrder: 13, visualMnemonicId: 'ru-l-card' },
	{ id: 'ru-m', character: 'М', pattern: '--', family: 'RU', category: 'letter', learningOrder: 14, visualMnemonicId: 'ru-m-card' },
	{ id: 'ru-n', character: 'Н', pattern: '-.', family: 'RU', category: 'letter', learningOrder: 15, visualMnemonicId: 'ru-n-card' },
	{ id: 'ru-o', character: 'О', pattern: '---', family: 'RU', category: 'letter', learningOrder: 16, visualMnemonicId: 'ru-o-card' },
	{ id: 'ru-p', character: 'П', pattern: '.--.', family: 'RU', category: 'letter', learningOrder: 17, visualMnemonicId: 'ru-p-card' },
	{ id: 'ru-r', character: 'Р', pattern: '.-.', family: 'RU', category: 'letter', learningOrder: 18, visualMnemonicId: 'ru-r-card' },
	{ id: 'ru-s', character: 'С', pattern: '...', family: 'RU', category: 'letter', learningOrder: 19, visualMnemonicId: 'ru-s-card' },
	{ id: 'ru-t', character: 'Т', pattern: '-', family: 'RU', category: 'letter', learningOrder: 20, visualMnemonicId: 'ru-t-card' },
	{ id: 'ru-u', character: 'У', pattern: '..-', family: 'RU', category: 'letter', learningOrder: 21, visualMnemonicId: 'ru-u-card' },
	{ id: 'ru-f', character: 'Ф', pattern: '..-.', family: 'RU', category: 'letter', learningOrder: 22, visualMnemonicId: 'ru-f-card' },
	{ id: 'ru-h', character: 'Х', pattern: '....', family: 'RU', category: 'letter', learningOrder: 23, visualMnemonicId: 'ru-h-card' },
	{ id: 'ru-c', character: 'Ц', pattern: '-.-.', family: 'RU', category: 'letter', learningOrder: 24, visualMnemonicId: 'ru-c-card' },
	{ id: 'ru-ch', character: 'Ч', pattern: '---.', family: 'RU', category: 'letter', learningOrder: 25, visualMnemonicId: 'ru-ch-card' },
	{ id: 'ru-sh', character: 'Ш', pattern: '----', family: 'RU', category: 'letter', learningOrder: 26, visualMnemonicId: 'ru-sh-card' },
	{ id: 'ru-shh', character: 'Щ', pattern: '--.-', family: 'RU', category: 'letter', learningOrder: 27, visualMnemonicId: 'ru-shh-card' },
	{ id: 'ru-hard', character: 'Ъ', pattern: '--.--', family: 'RU', category: 'letter', learningOrder: 28 },
	{ id: 'ru-y', character: 'Ы', pattern: '-.--', family: 'RU', category: 'letter', learningOrder: 29, visualMnemonicId: 'ru-y-card' },
	{ id: 'ru-soft', character: 'Ь', pattern: '-..-', family: 'RU', category: 'letter', learningOrder: 30, visualMnemonicId: 'ru-soft-card' },
	{ id: 'ru-e2', character: 'Э', pattern: '..-..', family: 'RU', category: 'letter', learningOrder: 31, visualMnemonicId: 'ru-e2-card' },
	{ id: 'ru-yu', character: 'Ю', pattern: '..--', family: 'RU', category: 'letter', learningOrder: 32, visualMnemonicId: 'ru-yu-card' },
	{ id: 'ru-ya', character: 'Я', pattern: '.-.-', family: 'RU', category: 'letter', learningOrder: 33, visualMnemonicId: 'ru-ya-card' },
]

/** Digits 0–9 (international). */
const DIGIT_DRAFTS: CatalogDraft[] = [
	{ id: 'digit-0', character: '0', pattern: '-----', family: 'DIGIT', category: 'digit', learningOrder: 0 },
	{ id: 'digit-1', character: '1', pattern: '.----', family: 'DIGIT', category: 'digit', learningOrder: 1 },
	{ id: 'digit-2', character: '2', pattern: '..---', family: 'DIGIT', category: 'digit', learningOrder: 2 },
	{ id: 'digit-3', character: '3', pattern: '...--', family: 'DIGIT', category: 'digit', learningOrder: 3 },
	{ id: 'digit-4', character: '4', pattern: '....-', family: 'DIGIT', category: 'digit', learningOrder: 4 },
	{ id: 'digit-5', character: '5', pattern: '.....', family: 'DIGIT', category: 'digit', learningOrder: 5 },
	{ id: 'digit-6', character: '6', pattern: '-....', family: 'DIGIT', category: 'digit', learningOrder: 6 },
	{ id: 'digit-7', character: '7', pattern: '--...', family: 'DIGIT', category: 'digit', learningOrder: 7 },
	{ id: 'digit-8', character: '8', pattern: '---..', family: 'DIGIT', category: 'digit', learningOrder: 8 },
	{ id: 'digit-9', character: '9', pattern: '----.', family: 'DIGIT', category: 'digit', learningOrder: 9 },
]

/**
 * Core punctuation (ITU-R M.1677-1 international set used by this app).
 * Russian-specific punctuation variants are out of scope for Phase 2.
 */
const PUNCTUATION_DRAFTS: CatalogDraft[] = [
	{ id: 'punct-period', character: '.', pattern: '.-.-.-', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 1 },
	{ id: 'punct-comma', character: ',', pattern: '--..--', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 2 },
	{ id: 'punct-question', character: '?', pattern: '..--..', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 3 },
	{ id: 'punct-slash', character: '/', pattern: '-..-.', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 4 },
	{ id: 'punct-equals', character: '=', pattern: '-...-', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 5 },
	{ id: 'punct-plus', character: '+', pattern: '.-.-.', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 6 },
	{ id: 'punct-minus', character: '-', pattern: '-....-', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 7 },
	{ id: 'punct-lparen', character: '(', pattern: '-.--.', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 8 },
	{ id: 'punct-rparen', character: ')', pattern: '-.--.-', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 9 },
	{ id: 'punct-colon', character: ':', pattern: '---...', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 10 },
	{ id: 'punct-apostrophe', character: "'", pattern: '.----.', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 11 },
	{ id: 'punct-quote', character: '"', pattern: '.-..-.', family: 'PUNCTUATION', category: 'punctuation', learningOrder: 12 },
]

/** Full canonical catalog (immutable array). */
export const MORSE_CATALOG: readonly MorseSymbol[] = Object.freeze([
	...LATIN_DRAFTS,
	...RUSSIAN_DRAFTS,
	...DIGIT_DRAFTS,
	...PUNCTUATION_DRAFTS,
].map(draftToSymbol))

/** Phase 1 compatibility: small sample used in early architecture tests. */
export const SAMPLE_MORSE_SYMBOLS: MorseSymbol[] = MORSE_CATALOG.filter(
	(symbol) =>
		symbol.id === 'ru-a' ||
		symbol.id === 'ru-b' ||
		symbol.id === 'ru-zh' ||
		symbol.id === 'ru-f' ||
		symbol.id === 'latin-a' ||
		symbol.id === 'digit-1',
)

export function getSampleSymbolById (id: string): MorseSymbol | undefined {
	return SAMPLE_MORSE_SYMBOLS.find((symbol) => symbol.id === id)
}

export function getSampleSymbolsForLesson (lessonId: string): MorseSymbol[] {
	// Phase 1 lesson hook — lesson-1 ≈ first learning-order letters.
	if (lessonId !== 'lesson-1' && lessonId !== 'lesson-2') {
		return []
	}
	const ids =
		lessonId === 'lesson-1'
			? ['ru-a', 'ru-b', 'latin-a']
			: ['ru-zh', 'ru-f']
	return SAMPLE_MORSE_SYMBOLS.filter((symbol) => ids.includes(symbol.id))
}
