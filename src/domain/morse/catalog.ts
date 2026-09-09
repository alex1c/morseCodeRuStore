/**
 * Minimal Morse catalog sample — enough to validate architecture,
 * not a full alphabet (full curriculum arrives in Phase 3).
 */

import type { MorseSymbol } from './types'

/** First-lesson Russian + Latin samples for architecture checks. */
export const SAMPLE_MORSE_SYMBOLS: MorseSymbol[] = [
	{
		id: 'ru-a',
		character: 'А',
		sequence: ['.', '-'],
		alphabet: 'RU',
		category: 'letter',
		lessonIds: ['lesson-1'],
		order: 1,
		enabled: true,
		visualMnemonicId: null,
	},
	{
		id: 'ru-b',
		character: 'Б',
		sequence: ['-', '.', '.', '.'],
		alphabet: 'RU',
		category: 'letter',
		lessonIds: ['lesson-1'],
		order: 2,
		enabled: true,
		visualMnemonicId: null,
	},
	{
		id: 'ru-zh',
		character: 'Ж',
		sequence: ['.', '.', '.', '-'],
		alphabet: 'RU',
		category: 'letter',
		lessonIds: ['lesson-2'],
		order: 10,
		enabled: true,
		visualMnemonicId: null,
	},
	{
		id: 'ru-f',
		character: 'Ф',
		sequence: ['.', '.', '-', '.'],
		alphabet: 'RU',
		category: 'letter',
		lessonIds: ['lesson-2'],
		order: 11,
		enabled: true,
		visualMnemonicId: null,
	},
	{
		id: 'latin-a',
		character: 'A',
		sequence: ['.', '-'],
		alphabet: 'LATIN',
		category: 'letter',
		lessonIds: ['lesson-1'],
		order: 1,
		enabled: true,
		visualMnemonicId: null,
	},
	{
		id: 'digit-1',
		character: '1',
		sequence: ['.', '-', '-', '-', '-'],
		alphabet: 'DIGIT',
		category: 'digit',
		lessonIds: [],
		order: 1,
		enabled: true,
		visualMnemonicId: null,
	},
]

/**
 * Look up a symbol by id from the sample catalog.
 */
export function getSampleSymbolById (
	id: string,
): MorseSymbol | undefined {
	return SAMPLE_MORSE_SYMBOLS.find((symbol) => symbol.id === id)
}

/**
 * Symbols belonging to a lesson, ordered for teaching sequence.
 */
export function getSampleSymbolsForLesson (
	lessonId: string,
): MorseSymbol[] {
	return SAMPLE_MORSE_SYMBOLS
		.filter(
			(symbol) =>
				symbol.enabled && symbol.lessonIds.includes(lessonId),
		)
		.sort((a, b) => a.order - b.order)
}
