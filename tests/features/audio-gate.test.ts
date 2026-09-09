import { createAudioGate } from '@/src/features/learning/audioGate'

describe('audio gate', () => {
	test('runs one playback at a time and supports replacement', async () => {
		const calls: string[] = []
		const gate = createAudioGate({
			stop: async () => {
				calls.push('stop')
			},
		})
		await gate.playReplacing(async () => {
			calls.push('play-A')
		})
		await gate.playReplacing(async () => {
			calls.push('play-B')
		})
		expect(calls).toEqual(['stop', 'play-A', 'stop', 'play-B'])
	})
})
