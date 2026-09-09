/**
 * Live tone vs playback mutual exclusion on MorseAudioService.
 */

import {
	getMorseAudioService,
	setMorseAudioServiceForTests,
	type MorseAudioService,
} from '@/src/features/morseAudio'

describe('sidetone audio mutual exclusion', () => {
	afterEach(() => {
		setMorseAudioServiceForTests(null)
	})

	test('startTone stops prior playback; stop clears live tone', async () => {
		const calls: string[] = []
		const mock: MorseAudioService = {
			stop: async () => {
				calls.push('stop')
			},
			stopTone: async () => {
				calls.push('stopTone')
			},
			startTone: async () => {
				calls.push('startTone')
			},
			playCode: async () => {
				calls.push('playCode')
			},
			playText: async () => {
				calls.push('playText')
			},
			playTimeline: async () => {
				calls.push('playTimeline')
			},
			isPlaying: () => false,
		}
		setMorseAudioServiceForTests(mock)
		const audio = getMorseAudioService()
		await audio.playCode(['dot'], {
			characterWpm: 12,
			frequencyHz: 600,
		})
		await audio.startTone(600)
		await audio.stopTone()
		await audio.stop()
		expect(calls).toEqual(['playCode', 'startTone', 'stopTone', 'stop'])
	})
})
