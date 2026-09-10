/**
 * Interstitial eligibility policy — Phase 11 rules.
 */

import { MIN_MEANINGFUL_SESSIONS_FOR_INTERSTITIAL } from '@/src/config/ads'
import { isInterstitialEligible } from '@/src/features/ads'

function base (
	overrides: Partial<Parameters<typeof isInterstitialEligible>[0]> = {},
) {
	return {
		onboardingCompleted: true,
		meaningfulSessionCount: MIN_MEANINGFUL_SESSIONS_FOR_INTERSTITIAL,
		shownThisAppSession: false,
		adReady: true,
		adsEnabled: true,
		isDailyFirstCompletionToday: false,
		isTrainingActive: false,
		...overrides,
	}
}

describe('interstitial policy', () => {
	test('eligible when all gates pass', () => {
		expect(isInterstitialEligible(base())).toBe(true)
	})

	test('excludes first sessions below min meaningful count', () => {
		expect(
			isInterstitialEligible(
				base({ meaningfulSessionCount: 0 }),
			),
		).toBe(false)
		expect(
			isInterstitialEligible(
				base({ meaningfulSessionCount: 1 }),
			),
		).toBe(false)
	})

	test('enforces in-memory session cap', () => {
		expect(
			isInterstitialEligible(
				base({ shownThisAppSession: true }),
			),
		).toBe(false)
	})

	test('excludes daily first-completion Home path', () => {
		expect(
			isInterstitialEligible(
				base({ isDailyFirstCompletionToday: true }),
			),
		).toBe(false)
	})

	test('excludes when ads disabled', () => {
		expect(
			isInterstitialEligible(base({ adsEnabled: false })),
		).toBe(false)
	})

	test('excludes when ad not ready', () => {
		expect(
			isInterstitialEligible(base({ adReady: false })),
		).toBe(false)
	})

	test('excludes during onboarding and active training', () => {
		expect(
			isInterstitialEligible(
				base({ onboardingCompleted: false }),
			),
		).toBe(false)
		expect(
			isInterstitialEligible(
				base({ isTrainingActive: true }),
			),
		).toBe(false)
	})
})
