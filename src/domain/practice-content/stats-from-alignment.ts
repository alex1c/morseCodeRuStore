/**
 * Map listening alignment steps → per-symbol attempt rows for adaptive stats.
 *
 * Rules:
 * - match → one correct attempt for the target symbol
 * - substitution → incorrect + answerSymbolId for the typed char
 * - missing → incorrect, answerSymbolId null
 * - extra → SKIP (no fake target attempt)
 * - spaces → SKIP (null symbol)
 * At most one attempt per target character (alignment already guarantees that
 * for match / substitution / missing).
 */

import type { AlignmentResult, AlignStep } from './alignment'
import { characterToSymbolId } from './symbols'
import type { PracticeAlphabet } from './types'

export type SymbolAttemptFromAlignment = {
	expectedSymbolId: string
	isCorrect: boolean
	answerSymbolId: string | null
}

function stepToAttempt (
	step: AlignStep,
	alphabet: PracticeAlphabet,
	allowDigits: boolean,
): SymbolAttemptFromAlignment | null {
	if (step.operation === 'extra') {
		return null
	}

	const targetChar = step.targetChar
	if (targetChar == null || targetChar === ' ') {
		return null
	}

	const expectedSymbolId = characterToSymbolId(
		targetChar,
		alphabet,
		allowDigits,
	)
	if (!expectedSymbolId) {
		return null
	}
	// Listening policy: never attribute attempts to ru-yo.
	const expected =
		expectedSymbolId === 'ru-yo' ? 'ru-e' : expectedSymbolId

	if (step.operation === 'match') {
		return {
			expectedSymbolId: expected,
			isCorrect: true,
			answerSymbolId: expected,
		}
	}

	if (step.operation === 'missing') {
		return {
			expectedSymbolId: expected,
			isCorrect: false,
			answerSymbolId: null,
		}
	}

	// substitution
	const answerChar = step.answerChar
	let answerSymbolId: string | null = null
	if (answerChar != null && answerChar !== ' ') {
		const rawAnswer = characterToSymbolId(
			answerChar,
			alphabet,
			allowDigits,
		)
		answerSymbolId = rawAnswer === 'ru-yo' ? 'ru-e' : rawAnswer
	}

	return {
		expectedSymbolId: expected,
		isCorrect: false,
		answerSymbolId,
	}
}

/**
 * Derive SymbolStats-friendly attempt rows from an alignment result.
 */
export function symbolAttemptsFromAlignment (
	alignment: AlignmentResult,
	alphabet: PracticeAlphabet,
	allowDigits = false,
): SymbolAttemptFromAlignment[] {
	const attempts: SymbolAttemptFromAlignment[] = []
	for (const step of alignment.steps) {
		const attempt = stepToAttempt(step, alphabet, allowDigits)
		if (attempt) {
			attempts.push(attempt)
		}
	}
	return attempts
}
