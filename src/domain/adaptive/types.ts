/**
 * Adaptive domain types — derived at runtime from SymbolStats.
 */

import type { SymbolStats } from '@/src/types'

export type MasteryTier =
	| 'new'
	| 'learning'
	| 'weak'
	| 'stable'
	| 'strong'

/** User-facing label key (UI maps to Russian). */
export type MasteryLabelKey =
	| 'new'
	| 'needsReview'
	| 'learned'
	| 'excellent'

export type WeaknessReasonKind =
	| 'lowAccuracy'
	| 'confusion'
	| 'slowResponse'
	| 'overdue'
	| 'insufficientData'

export type WeaknessReason = {
	kind: WeaknessReasonKind
	/** Short Russian sentence for UI. */
	message: string
}

export type SymbolMastery = {
	symbolId: string
	stats: SymbolStats
	attempts: number
	accuracyPercent: number
	/** 0..1 — higher means weaker / needs more practice. */
	weaknessScore: number
	insufficientData: boolean
	tier: MasteryTier
	labelKey: MasteryLabelKey
	reasons: WeaknessReason[]
	topConfusion: { answerSymbolId: string; count: number } | null
	daysSincePractice: number | null
}

export type ConfusionPair = {
	symbolIdA: string
	symbolIdB: string
	/** A → B count. */
	aToB: number
	/** B → A count. */
	bToA: number
	/** Aggregate directional sum. */
	total: number
}

export type AdaptiveWeightMap = Record<string, number>

export type AdaptivePoolPlan = {
	symbolIds: string[]
	weights: AdaptiveWeightMap
	/** True when adaptive ranking has enough data to be meaningful. */
	hasEnoughData: boolean
}
