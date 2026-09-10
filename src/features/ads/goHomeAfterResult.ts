/**
 * Navigate Home after an optional interstitial attempt.
 * Navigation is never blocked by ad load/show failure.
 */

import type { NavigationProp, ParamListBase } from '@react-navigation/native'

import { tryShowInterstitialBeforeHome } from './interstitialController'

type HomeNav = NavigationProp<ParamListBase>

export async function goHomeAfterResult (
	navigation: HomeNav,
	options: {
		isDailyFirstCompletionToday?: boolean
	} = {},
): Promise<void> {
	try {
		await tryShowInterstitialBeforeHome({
			isDailyFirstCompletionToday: options.isDailyFirstCompletionToday,
		})
	} catch {
		// Swallow — always navigate.
	}
	navigation.navigate('Home' as never)
}
