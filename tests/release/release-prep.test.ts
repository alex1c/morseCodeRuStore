/**
 * Phase 12A release identity / ads / privacy-url audits.
 */

import fs from 'fs'
import path from 'path'

import {
	APP_DISPLAY_NAME,
	APP_PACKAGE,
	APP_VERSION,
	PRIVACY_POLICY_URL,
} from '@/src/constants/app'
import {
	PRODUCTION_AD_UNITS,
	YANDEX_DEMO_AD_UNITS,
	getBannerAdUnitId,
	getInterstitialAdUnitId,
	getProductionMonetizationSnapshot,
	isMonetizationProductionBuild,
} from '@/src/config/ads'
import { FORBIDDEN_ANALYTICS_PROP_KEYS } from '@/src/analytics'
import { BACKUP_FORMAT } from '@/src/domain/backup'

const appJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'),
) as {
	expo: {
		name: string
		version: string
		android?: { package?: string; versionCode?: number }
	}
}

describe('release identity', () => {
	test('app name package version are consistent', () => {
		expect(APP_DISPLAY_NAME).toBe('Морзе-тренер')
		expect(APP_PACKAGE).toBe('com.calculatorplatform.morsecodetrainer')
		expect(APP_VERSION).toBe('1.0.0')
		expect(appJson.expo.name).toBe('Морзе-тренер')
		expect(appJson.expo.android?.package).toBe(APP_PACKAGE)
		expect(appJson.expo.version).toBe('1.0.0')
		expect(appJson.expo.android?.versionCode).toBe(1)
	})

	test('privacy policy URL is ForestMusic canonical path', () => {
		expect(PRIVACY_POLICY_URL).toBe(
			'https://forest-music.ru/privacy/morse-trainer',
		)
	})
})

describe('release ads production path', () => {
	test('production getters never return demo or rewarded units', () => {
		expect(getBannerAdUnitId(true)).toBe('R-M-20020170-1')
		expect(getInterstitialAdUnitId(true)).toBe('R-M-20020170-4')
		expect(getBannerAdUnitId(true)).not.toBe(YANDEX_DEMO_AD_UNITS.banner)
		expect(getInterstitialAdUnitId(true)).not.toBe(
			YANDEX_DEMO_AD_UNITS.interstitial,
		)
		expect(PRODUCTION_AD_UNITS).not.toHaveProperty('rewarded')
		const snap = getProductionMonetizationSnapshot()
		expect(snap.rewardedConfigured).toBe(false)
		expect(snap.reserveUsed).toBe(false)
	})

	test('dev build path uses demo units (not production impressions)', () => {
		// Jest runs with __DEV__ true — production gate must stay off in tests.
		expect(isMonetizationProductionBuild()).toBe(false)
		expect(getBannerAdUnitId()).toBe(YANDEX_DEMO_AD_UNITS.banner)
	})
})

describe('release analytics privacy keys', () => {
	test('forbidden prop keys remain blocked', () => {
		expect(FORBIDDEN_ANALYTICS_PROP_KEYS).toEqual(
			expect.arrayContaining([
				'text',
				'input',
				'answer',
				'phrase',
				'content',
				'filename',
				'path',
				'backup',
			]),
		)
	})
})

describe('backup format stability after rename', () => {
	test('backup format identifier unchanged', () => {
		expect(BACKUP_FORMAT).toBe('morse-code-trainer-backup')
	})
})
