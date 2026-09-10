/**
 * Build Daily → ReceiveSession launch params (one mixed Receive session).
 */

import {
	buildDailyPlan,
	filterEligibleItems,
	getPhraseItems,
	getWordItems,
	toLocalDateKey,
	wordMatchesLengthTier,
	type DailyAlphabet,
	type DailyPlan,
	type LocalDateString,
} from '@/src/domain'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	DEFAULT_RECEIVE_SETTINGS,
	type ReceiveQuestion,
	type ReceiveSettings,
} from '@/src/features/receive'
import type { SymbolStatsMap } from '@/src/types'
import { wallTimeMs } from '@/src/utils/clock'
import { buildDailyQuestions } from './buildDailyQuestions'

export type DailyLaunch = {
	settings: ReceiveSettings
	symbolPool: string[]
	seed: number
	weights?: AdaptiveWeightMap
	questions?: ReceiveQuestion[]
	sessionSource: 'daily'
	sessionStartedAtMs: number
	plan: DailyPlan
	/** Convenience mirrors of plan fields for nav meta. */
	prebuiltQuestions: ReceiveQuestion[]
	planMeta: {
		totalItems: number
		mixSummary: string
		estimateLabel: string
	}
}

export type BuildDailyLaunchInput = {
	alphabet: DailyAlphabet
	knownSymbolIds: string[]
	statsMap: SymbolStatsMap
	/** Saved Receive prefs (WPM / tone) — content overridden for Daily. */
	receiveBase?: Partial<ReceiveSettings>
	dateKey?: LocalDateString
}

/**
 * Check whether any short words / phrases are eligible for the known set.
 */
function eligibilityFlags (
	alphabet: DailyAlphabet,
	knownSymbolIds: string[],
): {
	hasEligibleShortWords: boolean
	hasEligiblePhrases: boolean
	digitsUnlocked: boolean
} {
	const shortWords = filterEligibleItems(
		getWordItems(alphabet),
		knownSymbolIds,
	).filter((item) => wordMatchesLengthTier(item, 'short'))
	const phrases = filterEligibleItems(
		getPhraseItems(alphabet),
		knownSymbolIds,
	)
	const knownLetters = knownSymbolIds.filter((id) => {
		// Digits unlock heuristically with letter progress (plan also gates).
		return !id.startsWith('digit-')
	})
	return {
		hasEligibleShortWords: shortWords.length > 0,
		hasEligiblePhrases: phrases.length > 0,
		digitsUnlocked: knownLetters.length >= 12,
	}
}

/**
 * Build a deterministic Daily launch targeting a single mixed Receive session.
 */
export function buildDailyLaunch (
	input: BuildDailyLaunchInput,
): DailyLaunch {
	const dateKey = input.dateKey ?? toLocalDateKey()
	const flags = eligibilityFlags(input.alphabet, input.knownSymbolIds)
	const plan = buildDailyPlan({
		dateKey,
		alphabet: input.alphabet,
		knownSymbolIds: input.knownSymbolIds,
		statsMap: input.statsMap,
		hasEligibleShortWords: flags.hasEligibleShortWords,
		hasEligiblePhrases: flags.hasEligiblePhrases,
		digitsUnlocked: flags.digitsUnlocked,
	})

	// Rebuild mixed pool weights from plan segments (union of segment pools).
	const pool = [
		...new Set(plan.segments.flatMap((segment) => segment.symbolPool)),
	]
	const questions = buildDailyQuestions({ plan })
	const totalItems = questions.length > 0 ? questions.length : plan.totalItems

	// Finite session; keyboard covers multi-char segments reliably.
	const sessionLength: ReceiveSettings['sessionLength'] =
		totalItems <= 5
			? 5
			: totalItems <= 10
				? 10
				: totalItems <= 20
					? 20
					: 50

	const settings: ReceiveSettings = {
		...DEFAULT_RECEIVE_SETTINGS,
		...(input.receiveBase ?? {}),
		alphabet: input.alphabet,
		answerMode: 'keyboard',
		symbolPreset: 'custom',
		customSymbolIds: pool,
		sessionLength,
		contentKind: 'symbol',
		includeMixedDigits: false,
	}

	const startedAt = wallTimeMs()
	return {
		settings,
		symbolPool: pool,
		seed: plan.seed,
		questions,
		prebuiltQuestions: questions,
		sessionSource: 'daily',
		sessionStartedAtMs: startedAt,
		plan,
		planMeta: {
			totalItems,
			mixSummary: plan.mixSummary,
			estimateLabel: plan.estimateLabel,
		},
	}
}
