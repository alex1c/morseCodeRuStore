/**
 * Core Morse domain types.
 * Timing and audio live elsewhere — this file is data-shape only (+ small pure helpers).
 */

/** Alphabet / catalog family for a symbol row. */
export type AlphabetFamily = 'RU' | 'LATIN' | 'DIGIT' | 'PUNCTUATION'

/**
 * Encode/decode context chosen by the learner.
 * Digits and punctuation are available in every context.
 */
export type AlphabetContext = 'RU' | 'LATIN' | 'BOTH'

/** Strict Morse signal element (never a free-form string). */
export type MorseElement = 'dot' | 'dash'

/** Category used for filters, lessons, and future expansion. */
export type MorseCategory =
	| 'letter'
	| 'digit'
	| 'punctuation'
	| 'prosign'

/**
 * Canonical Morse symbol.
 * Mnemonics (Phase 3) reference `id` / `visualMnemonicId` — never duplicate `code`.
 */
export type MorseSymbol = {
	/** Stable id, e.g. "ru-zh" or "latin-a". */
	id: string
	/** Display character (letters upper-case). */
	character: string
	/** Ordered Morse elements (canonical code). */
	code: MorseElement[]
	family: AlphabetFamily
	category: MorseCategory
	/**
	 * Curriculum / display ordering hook within the family.
	 * Lower values appear earlier in learning lists.
	 */
	learningOrder: number
	/** Soft-disable without deleting catalog rows. */
	enabled: boolean
	/**
	 * Phase 3 visual mnemonic card id. Null until artwork exists.
	 * Must always resolve against this symbol's `code`, never a private copy.
	 */
	visualMnemonicId: string | null
	/**
	 * When true, encode accepts this character but decode of its pattern
	 * prefers another canonical symbol (used for Ё → Е).
	 */
	decodeAliasOfId?: string
}

/** @deprecated Prefer AlphabetFamily — kept for Phase 1 import compatibility. */
export type AlphabetType = AlphabetFamily

/** Accuracy helper — 0 when there are no attempts (avoids NaN). */
export function calculateAccuracyPercent (
	correct: number,
	attempts: number,
): number {
	if (attempts <= 0) {
		return 0
	}
	return Math.round((correct / attempts) * 1000) / 10
}

/**
 * Record a practice attempt into SymbolStats-shaped fields (pure).
 * confusionMap enables pairs like Ж → Ф in Phase 5.
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
		/** Null for paper/self-check — do not invent 0 ms. */
		responseTimeMs: number | null
		practicedAt: string
		answerSymbolId?: string
	},
) {
	const attempts = previous.attempts + 1
	const correct = previous.correct + (input.isCorrect ? 1 : 0)
	const incorrect = previous.incorrect + (input.isCorrect ? 0 : 1)
	const averageResponseTimeMs =
		input.responseTimeMs == null
			? previous.averageResponseTimeMs
			: previous.attempts === 0 || previous.averageResponseTimeMs <= 0
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
