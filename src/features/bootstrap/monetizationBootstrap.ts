/**
 * Async, non-blocking Ads + AppMetrica bootstrap.
 * Must never delay first render or crash the trainer.
 */

import {
	ANALYTICS_EVENTS,
	initializeAppMetrica,
	trackAnalyticsEvent,
} from '@/src/analytics'
import {
	initializeYandexAds,
	preloadInterstitial,
} from '@/src/features/ads'

let started = false

/**
 * Fire-and-forget SDK init. Safe to call once from App root.
 */
export function startMonetizationAndAnalytics (): void {
	if (started) {
		return
	}
	started = true
	try {
		initializeAppMetrica()
		trackAnalyticsEvent(ANALYTICS_EVENTS.APP_OPEN)
	} catch {
		// AppMetrica failure must not affect the app.
	}
	void (async () => {
		try {
			await initializeYandexAds()
			preloadInterstitial()
		} catch {
			// Ads failure must not affect the app.
		}
	})()
}

/** Test helper — allow re-running bootstrap. */
export function resetMonetizationBootstrapForTests (): void {
	started = false
}
