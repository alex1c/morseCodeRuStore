/**
 * Jest setup — AsyncStorage + expo-av mocks for Node test environment.
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
