/**
 * Map practice-content session plans → Receive questions.
 */

import {
	buildPracticeSessionPlan,
	getSymbolById,
	type PracticeItem,
	type PracticeSessionContentKind,
} from '@/src/domain'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	generateReceiveQuestions,
	type GenerateReceiveSessionInput,
} from './generator'
import type {
	ReceiveContentKind,
	ReceiveQuestion,
	ReceiveSettings,
	ReceiveSessionLength,
} from './types'

export type RetryReceiveItem = {
	text: string
	contentKind: Exclude<ReceiveContentKind, 'symbol'>
	requiredSymbolIds: string[]
}

/**
 * Convert PracticeItems into ReceiveQuestion rows for the session UI.
 */
export function buildReceiveQuestionsFromPlan (
	items: PracticeItem[],
): ReceiveQuestion[] {
	return items.map((item, index) => ({
		id: item.id || `practice-${index + 1}`,
		contentKind: item.kind,
		symbolId: item.requiredSymbolIds[0] ?? '',
		text: item.text,
		requiredSymbolIds: [...item.requiredSymbolIds],
		optionSymbolIds: [],
	}))
}

/**
 * Build Receive questions from forced wrong-item retries.
 */
export function buildReceiveQuestionsFromRetryItems (
	items: RetryReceiveItem[],
): ReceiveQuestion[] {
	return items.map((item, index) => ({
		id: `retry-${index + 1}`,
		contentKind: item.contentKind,
		symbolId: item.requiredSymbolIds[0] ?? '',
		text: item.text,
		requiredSymbolIds: [...item.requiredSymbolIds],
		optionSymbolIds: [],
	}))
}

function toFiniteSessionLength (
	length: ReceiveSessionLength,
): 5 | 10 | 20 | 50 {
	if (length === 'infinite') {
		return 20
	}
	return length
}

export type ResolveSessionQuestionsInput = {
	settings: ReceiveSettings
	symbolPool: string[]
	seed: number
	weights?: AdaptiveWeightMap
	cooldownN?: number
	retryItems?: RetryReceiveItem[]
	infinitePreviewLength?: number
}

/**
 * Resolve the question list for a Receive session launch.
 * Symbol mode keeps the classic generator; other kinds use practice plans.
 */
export function resolveSessionQuestions (
	input: ResolveSessionQuestionsInput,
): { questions: ReceiveQuestion[]; blockedReason?: string } {
	if (input.retryItems && input.retryItems.length > 0) {
		return {
			questions: buildReceiveQuestionsFromRetryItems(input.retryItems),
		}
	}

	const { settings } = input
	if (settings.contentKind === 'symbol') {
		const generateInput: GenerateReceiveSessionInput = {
			alphabet: settings.alphabet,
			symbolPool: input.symbolPool,
			sessionLength: settings.sessionLength,
			seed: input.seed,
			infinitePreviewLength: input.infinitePreviewLength,
			weights: input.weights,
			cooldownN: input.cooldownN,
		}
		return { questions: generateReceiveQuestions(generateInput) }
	}

	const contentKind = settings.contentKind as PracticeSessionContentKind
	const plan = buildPracticeSessionPlan({
		contentKind,
		alphabet: settings.alphabet,
		allowedSymbolIds: input.symbolPool,
		seed: input.seed,
		sessionLength: toFiniteSessionLength(settings.sessionLength),
		groupLength: settings.groupLength,
		digitLength: settings.digitGroupLength,
		wordTier: settings.wordLengthTier,
		weights: input.weights,
		cooldownN: input.cooldownN,
		allowDigits: settings.includeMixedDigits,
		mixedLettersAndDigits:
			settings.contentKind === 'group' && settings.includeMixedDigits,
	})

	if (plan.blockedReason) {
		return { questions: [], blockedReason: plan.blockedReason }
	}

	return { questions: buildReceiveQuestionsFromPlan(plan.items) }
}

/**
 * Build a single infinite-mode symbol question (append helper).
 */
export function buildInfiniteSymbolQuestion (input: {
	id: string
	symbolId: string
	optionSymbolIds: string[]
}): ReceiveQuestion {
	const symbol = getSymbolById(input.symbolId)
	return {
		id: input.id,
		contentKind: 'symbol',
		symbolId: input.symbolId,
		text: symbol?.character ?? '',
		requiredSymbolIds: [input.symbolId],
		optionSymbolIds: input.optionSymbolIds,
	}
}
