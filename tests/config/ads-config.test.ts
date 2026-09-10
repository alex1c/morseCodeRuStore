/**
 * Production monetization config — IDs and unused units.
 */

import {
	APPMETRICA_PRODUCTION_API_KEY,
	PRODUCTION_AD_UNITS,
	getBannerAdUnitId,
	getInterstitialAdUnitId,
	getProductionMonetizationSnapshot,
} from '@/src/config/ads'

/** Cabinet IDs that must never appear in runtime getters. */
const CABINET_UNUSED = {
	reserve2: 'R-M-20020170-2',
	reserve3: 'R-M-20020170-3',
	rewarded: 'R-M-20020170-5',
} as const

describe('ads config', () => {
	test('production banner and interstitial IDs are correct', () => {
		expect(PRODUCTION_AD_UNITS.banner).toBe('R-M-20020170-1')
		expect(PRODUCTION_AD_UNITS.interstitial).toBe('R-M-20020170-4')
		expect(getBannerAdUnitId(true)).toBe('R-M-20020170-1')
		expect(getInterstitialAdUnitId(true)).toBe('R-M-20020170-4')
		expect(APPMETRICA_PRODUCTION_API_KEY.length).toBeGreaterThan(10)
	})

	test('rewarded and reserve units are not used by runtime getters', () => {
		const banner = getBannerAdUnitId(true)
		const interstitial = getInterstitialAdUnitId(true)
		expect(banner).not.toBe(CABINET_UNUSED.reserve2)
		expect(banner).not.toBe(CABINET_UNUSED.reserve3)
		expect(banner).not.toBe(CABINET_UNUSED.rewarded)
		expect(interstitial).not.toBe(CABINET_UNUSED.rewarded)
		expect(interstitial).not.toBe(CABINET_UNUSED.reserve2)

		const snapshot = getProductionMonetizationSnapshot()
		expect(snapshot.rewardedConfigured).toBe(false)
		expect(snapshot.reserveUsed).toBe(false)
		expect(snapshot.banner).toBe(PRODUCTION_AD_UNITS.banner)
		expect(snapshot.interstitial).toBe(PRODUCTION_AD_UNITS.interstitial)
	})
})
