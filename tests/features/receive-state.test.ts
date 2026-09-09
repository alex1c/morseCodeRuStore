/**
 * Receive state machine transitions.
 */

import {
	canAnswer,
	canReplay,
	createInitialReceiveContext,
	currentQuestion,
	reduceReceiveMachine,
} from '@/src/features/receive'

const sampleQuestions = [
	{
		id: 'q1',
		symbolId: 'ru-a',
		optionSymbolIds: ['ru-a', 'ru-t', 'ru-n', 'ru-o'],
	},
	{
		id: 'q2',
		symbolId: 'ru-t',
		optionSymbolIds: ['ru-t', 'ru-a', 'ru-n', 'ru-o'],
	},
]

describe('receive state machine', () => {
	test('idle -> preparing -> playing -> awaitingAnswer', () => {
		let ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: sampleQuestions,
			infinite: false,
		})
		expect(ctx.state).toBe('preparing')
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		expect(ctx.state).toBe('playing')
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 500 })
		expect(ctx.state).toBe('awaitingAnswer')
		expect(canAnswer(ctx)).toBe(true)
	})

	test('correct and wrong flows', () => {
		let ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: sampleQuestions,
			infinite: false,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 500 })
		ctx = reduceReceiveMachine(ctx, {
			type: 'ANSWER',
			selectedSymbolId: 'ru-a',
			isCorrect: true,
			now: 1000,
		})
		expect(ctx.state).toBe('feedbackCorrect')
		ctx = reduceReceiveMachine(ctx, { type: 'ADVANCE' })
		expect(ctx.state).toBe('preparing')
		expect(ctx.index).toBe(1)

		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 1500 })
		ctx = reduceReceiveMachine(ctx, {
			type: 'ANSWER',
			selectedSymbolId: 'ru-a',
			isCorrect: false,
			now: 2000,
		})
		expect(ctx.state).toBe('feedbackWrong')
		expect(canReplay(ctx)).toBe(true)
	})

	test('replay does not create an answer', () => {
		let ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: sampleQuestions,
			infinite: false,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 500 })
		ctx = reduceReceiveMachine(ctx, { type: 'REPLAY' })
		expect(ctx.state).toBe('replaying')
		expect(ctx.answered).toHaveLength(0)
		expect(ctx.currentReplayCount).toBe(1)
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 900 })
		expect(ctx.state).toBe('awaitingAnswer')
	})

	test('rejects double answer while playing', () => {
		let ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: sampleQuestions,
			infinite: false,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		const blocked = reduceReceiveMachine(ctx, {
			type: 'ANSWER',
			selectedSymbolId: 'ru-a',
			isCorrect: true,
			now: 1,
		})
		expect(blocked.state).toBe('playing')
		expect(blocked.answered).toHaveLength(0)
	})

	test('finish and cancel', () => {
		let ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: [sampleQuestions[0]],
			infinite: false,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_STARTED' })
		ctx = reduceReceiveMachine(ctx, { type: 'PLAY_FINISHED', now: 5 })
		ctx = reduceReceiveMachine(ctx, {
			type: 'ANSWER',
			selectedSymbolId: 'ru-a',
			isCorrect: true,
			now: 10,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'ADVANCE' })
		expect(ctx.state).toBe('finished')

		ctx = createInitialReceiveContext()
		ctx = reduceReceiveMachine(ctx, {
			type: 'START',
			questions: sampleQuestions,
			infinite: false,
		})
		ctx = reduceReceiveMachine(ctx, { type: 'CANCEL' })
		expect(ctx.state).toBe('cancelled')
		expect(currentQuestion(ctx)?.id).toBe('q1')
	})
})
