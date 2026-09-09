/**
 * Practice content types for groups / words / phrases / digits.
 */

export type PracticeAlphabet = 'RU' | 'LATIN'

export type PracticeContentKind =
	| 'symbol'
	| 'group'
	| 'word'
	| 'phrase'
	| 'digits'

export type WordLengthTier = 'short' | 'medium' | 'long' | 'mixed'

export type PracticeItem = {
	id: string
	kind: Exclude<PracticeContentKind, 'symbol'>
	alphabet: PracticeAlphabet
	/** Display / answer text (spaces allowed for phrases). */
	text: string
	/** Canonical MorseSymbol.id list in order (spaces omitted). */
	requiredSymbolIds: string[]
	/** Character length excluding spaces. */
	symbolCount: number
	difficulty: number
}

export type GroupLength = 2 | 3 | 4 | 5
export type DigitGroupLength = 1 | 2 | 3 | 4 | 5
