/**
 * Central monetization + analytics identifiers (Phase 11).
 * Production IDs are real РСЯ / AppMetrica values provided for this app.
 * Dev builds use official Yandex demo units — never production impressions in QA.
 */

/** Minimum completed meaningful training sessions before interstitial may show. */
export const MIN_MEANINGFUL_SESSIONS_FOR_INTERSTITIAL = 2

/** Official Yandex demo ad units — safe for __DEV__ / local QA. */
export const YANDEX_DEMO_AD_UNITS = {
	banner: 'demo-banner-yandex',
	interstitial: 'demo-interstitial-yandex',
} as const

/**
 * Production РСЯ units for Морзе-тренер.
 * Reserve banners R-M-20020170-2 / -3 and rewarded R-M-20020170-5
 * exist in the cabinet but are intentionally NOT wired into runtime.
 */
export const PRODUCTION_AD_UNITS = {
	banner: 'R-M-20020170-1',
	interstitial: 'R-M-20020170-4',
} as const

/**
 * AppMetrica API key — public SDK identifier (not a secret password).
 * Do not log this value in production paths.
 */
export const APPMETRICA_PRODUCTION_API_KEY =
	'11f43b9e-488c-48a7-83a1-3f210ae5e826'

/** Calm screens that may show a bottom banner. */
export type BannerPlacement =
	| 'home'
	| 'course'
	| 'stats'
	| 'translator'
	| 'reference'
	| 'learning'
	| 'settings'
	| 'errors'

/** True when release/production ad identifiers should be selected. */
export function isMonetizationProductionBuild (): boolean {
	return !__DEV__
}

/** Resolves banner ad unit id for the current build flavor. */
export function getBannerAdUnitId (
	production = isMonetizationProductionBuild(),
): string {
	if (!production) {
		return YANDEX_DEMO_AD_UNITS.banner
	}
	return PRODUCTION_AD_UNITS.banner
}

/** Resolves interstitial ad unit id for the current build flavor. */
export function getInterstitialAdUnitId (
	production = isMonetizationProductionBuild(),
): string {
	if (!production) {
		return YANDEX_DEMO_AD_UNITS.interstitial
	}
	return PRODUCTION_AD_UNITS.interstitial
}

/**
 * Resolves AppMetrica API key.
 * Dev uses a zero UUID so smoke tests never hit production analytics.
 */
export function getAppMetricaApiKey (
	production = isMonetizationProductionBuild(),
): string {
	if (!production) {
		return '00000000-0000-0000-0000-000000000000'
	}
	return APPMETRICA_PRODUCTION_API_KEY
}

/** Snapshot for release audits / tests. */
export function getProductionMonetizationSnapshot (): {
	banner: string
	interstitial: string
	appMetricaConfigured: boolean
	rewardedConfigured: boolean
	reserveUsed: boolean
} {
	return {
		banner: getBannerAdUnitId(true),
		interstitial: getInterstitialAdUnitId(true),
		appMetricaConfigured: Boolean(APPMETRICA_PRODUCTION_API_KEY),
		rewardedConfigured: false,
		reserveUsed: false,
	}
}
