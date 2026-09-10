/**
 * Pure interstitial eligibility — no SDK / UI (Phase 11 policy).
 * Frequency: max 1 show per app process (in-memory).
 */

import { MIN_MEANINGFUL_SESSIONS_FOR_INTERSTITIAL } from '@/src/config/ads'

export type InterstitialEligibilityInput = {
	/** Onboarding finished — never show during intro. */
	onboardingCompleted: boolean
	/** Completed lesson/receive/transmit/daily/quick sessions in history. */
	meaningfulSessionCount: number
	/** In-memory: interstitial already shown this app process. */
	shownThisAppSession: boolean
	/** SDK has a loaded interstitial ready. */
	adReady: boolean
	/** Ads disabled (tests / screenshot / missing config). */
	adsEnabled: boolean
	/**
	 * True when navigating Home from the first successful Daily
	 * completion of the local day — always excluded.
	 */
	isDailyFirstCompletionToday: boolean
	/** Active Morse training / output — never interrupt. */
	isTrainingActive: boolean
}

/**
 * Whether policy allows attempting an interstitial show.
 * Callers still navigate Home regardless of the result.
 */
export function isInterstitialEligible (
	input: InterstitialEligibilityInput,
	minSessions = MIN_MEANINGFUL_SESSIONS_FOR_INTERSTITIAL,
): boolean {
	if (!input.adsEnabled) {
		return false
	}
	if (!input.onboardingCompleted) {
		return false
	}
	if (input.shownThisAppSession) {
		return false
	}
	if (!input.adReady) {
		return false
	}
	if (input.isTrainingActive) {
		return false
	}
	if (input.isDailyFirstCompletionToday) {
		return false
	}
	// First lesson + first training excluded via min count ≥ 2.
	if (input.meaningfulSessionCount < minSessions) {
		return false
	}
	return true
}
