/**
 * InterstitialController — in-memory session cap + eligibility + show.
 * Ads never mutate training stats / streak / history.
 */

import { getSessionHistory, getUserPreferences } from '@/src/storage'
import type { SessionSource } from '@/src/domain/session-history'
import { isInterstitialEligible } from './interstitialPolicy'
import {
	createYandexInterstitialBridge,
	type InterstitialNativeBridge,
} from './yandexAdsAdapter'

const MEANINGFUL_SOURCES: SessionSource[] = [
	'lesson',
	'receive',
	'transmit',
	'daily',
	'quick',
]

let shownThisAppSession = false
let adsEnabled = true
let trainingActive = false
let bridge: InterstitialNativeBridge = createYandexInterstitialBridge()

/** Inject test double for the interstitial bridge. */
export function setInterstitialBridgeForTests (
	next: InterstitialNativeBridge,
): void {
	bridge = next
}

export function resetInterstitialBridgeForTests (): void {
	bridge = createYandexInterstitialBridge()
}

export function resetInterstitialSessionForTests (): void {
	shownThisAppSession = false
	adsEnabled = true
	trainingActive = false
}

export function setAdsEnabledForTests (enabled: boolean): void {
	adsEnabled = enabled
}

/** Mark whether Morse training / live output is active (blocks interstitial). */
export function setTrainingActive (active: boolean): void {
	trainingActive = active
}

export function hasShownInterstitialThisAppSession (): boolean {
	return shownThisAppSession
}

/** Count completed meaningful sessions from history (privacy-safe count only). */
export function countMeaningfulSessions (
	sources: { source: SessionSource }[],
): number {
	return sources.filter((s) => MEANINGFUL_SOURCES.includes(s.source)).length
}

/** Background preload — safe to call multiple times. */
export function preloadInterstitial (): void {
	if (!adsEnabled) {
		return
	}
	void bridge.preload().catch(() => undefined)
}

export type TryShowInterstitialOptions = {
	/** First Daily completion of the local day — always exclude. */
	isDailyFirstCompletionToday?: boolean
}

/**
 * Attempt interstitial before navigating Home.
 * Never blocks navigation — caller always continues to Home after await.
 * Returns whether an ad was actually shown.
 */
export async function tryShowInterstitialBeforeHome (
	options: TryShowInterstitialOptions = {},
): Promise<boolean> {
	if (!adsEnabled) {
		return false
	}
	try {
		const [prefs, history] = await Promise.all([
			getUserPreferences(),
			getSessionHistory(),
		])
		const meaningfulSessionCount = countMeaningfulSessions(history.sessions)
		const eligible = isInterstitialEligible({
			onboardingCompleted: prefs.onboardingCompleted,
			meaningfulSessionCount,
			shownThisAppSession,
			adReady: bridge.isReady(),
			adsEnabled,
			isDailyFirstCompletionToday:
				options.isDailyFirstCompletionToday === true,
			isTrainingActive: trainingActive,
		})
		if (!eligible) {
			return false
		}
		const shown = await bridge.show()
		if (shown) {
			shownThisAppSession = true
		}
		return shown
	} catch {
		return false
	}
}
