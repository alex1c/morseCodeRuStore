/**
 * Jest setup — AsyncStorage + expo-audio + optional native SDK mocks.
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(() => ({
		play: jest.fn(),
		pause: jest.fn(),
		remove: jest.fn(),
		volume: 1,
		loop: false,
	})),
	setAudioModeAsync: jest.fn(async () => undefined),
}))

// Native ads SDK — prevent require() failures in Node/Jest.
jest.mock('yandex-mobile-ads', () => ({
	MobileAds: {
		initialize: jest.fn(async () => undefined),
	},
	BannerAdSize: {
		stickySize: jest.fn(async () => ({ width: 320, height: 50 })),
	},
	InterstitialAdLoader: {
		create: jest.fn(async () => ({
			loadAd: jest.fn(async () => ({
				show: jest.fn(async () => undefined),
			})),
		})),
	},
	BannerView: () => null,
}))

// AppMetrica SDK — prevent require() failures in Node/Jest.
jest.mock('@appmetrica/react-native-analytics', () => ({
	__esModule: true,
	default: {
		activate: jest.fn(),
		reportEvent: jest.fn(),
	},
}))
