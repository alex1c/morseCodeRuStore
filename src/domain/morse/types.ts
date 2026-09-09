/**
 * Morse domain model foundation for Phase 2 Morse Engine.
 * No audio playback here — only types, catalog sample data, and pure helpers.
 */

/** Alphabet families supported by the trainer. */
export type AlphabetType = 'RU' | 'LATIN' | 'DIGIT' | 'PUNCTUATION'

/** Dot / dash building blocks of a Morse sequence. */
export type MorseElement = '.' | '-'

/** Category used for lesson grouping and filters. */
export type MorseCategory =
	| 'letter'
	| 'digit'
	| 'punctuation'
	| 'prosign'

/**
 * Canonical Morse symbol entity.
 * Visual mnemonic cards (Phase 3) will attach by symbolId without changing this core.
 */
export type MorseSymbol = {
	/** Stable id, e.g. "ru-zh" or "latin-a". */
	id: string
	/** Display character (upper-case for letters). */
	character: string
	/** Ordered Morse elements strictly matching the official code. */
	sequence: MorseElement[]
	alphabet: AlphabetType
	category: MorseCategory
	/** Optional lesson membership for curriculum ordering. */
	lessonIds: string[]
	/** Sort order within alphabet / lesson. */
	order: number
	/** Soft-disable without deleting catalog rows. */
	enabled: boolean
	/**
	 * Optional Phase 3 hook: id of a visual mnemonic card asset/definition.
	 * Kept nullable so Phase 1–2 never depend on artwork.
	 */
	visualMnemonicId: string | null
}

/**
 * Encode sequence as the classic Morse string (e.g. "·−" / ".-").
 * Uses ASCII . and - for persistence and tests.
 */
export function sequenceToPattern (sequence: MorseElement[]): string {
	return sequence.join('')
}

/**
 * Parse a Morse pattern string into elements. Invalid chars are ignored.
 */
export function patternToSequence (pattern: string): MorseElement[] {
	const elements: MorseElement[] = []
	for (const char of pattern) {
		if (char === '.' || char === '-') {
			elements.push(char)
		}
	}
	return elements
}

/**
 * Accuracy helper shared by stats UI and adaptive trainer later.
 * Returns 0 when there are no attempts (avoids NaN).
 */
export function calculateAccuracyPercent (
	correct: number,
	attempts: number,
): number {
	if (attempts <= 0) {
		return 0
	}
	const ratio = correct / attempts
	return Math.round(ratio * 1000) / 10
}

/**
 * Record a practice attempt into SymbolStats-shaped fields (pure).
 * When incorrect and answerSymbolId is set, increments confusionMap.
 */
export function applyAttemptToStats (
	previous: {
		symbolId: string
		attempts: number
		correct: number
		incorrect: number
		averageResponseTimeMs: number
		lastPracticedAt: string | null
		confusionMap: Record<string, number>
	},
	input: {
		isCorrect: boolean
		responseTimeMs: number
		practicedAt: string
		/** Symbol the user chose when wrong — enables Ж→Ф confusion tracking. */
		answerSymbolId?: string
	},
) {
	const attempts = previous.attempts + 1
	const correct = previous.correct + (input.isCorrect ? 1 : 0)
	const incorrect = previous.incorrect + (input.isCorrect ? 0 : 1)
	const averageResponseTimeMs =
		previous.attempts === 0
			? input.responseTimeMs
			: Math.round(
				(previous.averageResponseTimeMs * previous.attempts +
					input.responseTimeMs) /
					attempts,
			)

	const confusionMap = { ...previous.confusionMap }
	if (!input.isCorrect && input.answerSymbolId) {
		confusionMap[input.answerSymbolId] =
			(confusionMap[input.answerSymbolId] ?? 0) + 1
	}

	return {
		symbolId: previous.symbolId,
		attempts,
		correct,
		incorrect,
		averageResponseTimeMs,
		lastPracticedAt: input.practicedAt,
		confusionMap,
	}
}
