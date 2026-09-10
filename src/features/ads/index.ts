/**
 * Ads feature barrel (Phase 11).
 */

export { AdBanner } from '@/src/components/ads/AdBanner'
export { goHomeAfterResult } from './goHomeAfterResult'
export {
	countMeaningfulSessions,
	hasShownInterstitialThisAppSession,
	preloadInterstitial,
	resetInterstitialBridgeForTests,
	resetInterstitialSessionForTests,
	setAdsEnabledForTests,
	setInterstitialBridgeForTests,
	setTrainingActive,
	tryShowInterstitialBeforeHome,
} from './interstitialController'
export { isInterstitialEligible } from './interstitialPolicy'
export {
	getYandexAdsModule,
	initializeYandexAds,
	resetYandexAdsModuleCache,
} from './yandexAdsAdapter'
