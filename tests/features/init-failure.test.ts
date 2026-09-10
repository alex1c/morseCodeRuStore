/**
 * Native SDK init must never throw when modules are unavailable.
 */

import {
	initializeAppMetrica,
	resetAppMetricaForTests,
} from '@/src/analytics'
import {
	initializeYandexAds,
	resetYandexAdsModuleCache,
} from '@/src/features/ads'

describe('monetization init failure safety', () => {
	beforeEach(() => {
		resetAppMetricaForTests()
		resetYandexAdsModuleCache()
	})

	test('initializeAppMetrica does not throw when module is null', () => {
		expect(() => initializeAppMetrica()).not.toThrow()
		// Second call is also safe (activation guard).
		expect(() => initializeAppMetrica()).not.toThrow()
	})

	test('initializeYandexAds does not throw when module is null', async () => {
		await expect(initializeYandexAds()).resolves.toBeUndefined()
	})
})
