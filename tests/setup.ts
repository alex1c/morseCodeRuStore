/**
 * Jest setup — AsyncStorage + expo-av + optional native SDK mocks.
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

jest.mock('expo-av', () => ({
	Audio: {
		Sound: {
			createAsync: jest.fn(async () => ({
				sound: {
					stopAsync: jest.fn(async () => undefined),
					unloadAsync: jest.fn(async () => undefined),
				},
			})),
		},
		setAudioModeAsync: jest.fn(async () => undefined),
	},
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
