/**
 * Transmit state machine.
 */

import {
	canKey,
	createInitialTransmitContext,
	reduceTransmitMachine,
} from '@/src/features/transmit'

const questions = [
	{ id: 't1', symbolId: 'ru-a' },
	{ id: 't2', symbolId: 'ru-t' },
]

describe('transmit state machine', () => {
	test('ready -> keyDown -> release collecting', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, { type: 'START', questions })
		expect(ctx.state).toBe('ready')
		expect(canKey(ctx)).toBe(true)
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 1000 })
		expect(ctx.state).toBe('keyDown')
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dot', durationMs: 100, quality: 'good' },
		})
		expect(ctx.state).toBe('collecting')
		expect(ctx.presses).toHaveLength(1)
	})

	test('multiple elements, evaluate, advance, finish', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, {
			type: 'START',
			questions: [questions[0]],
		})
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 1 })
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dot', durationMs: 100, quality: 'good' },
		})
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 2 })
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dash', durationMs: 300, quality: 'good' },
		})
		ctx = reduceTransmitMachine(ctx, {
			type: 'EVALUATE',
			record: {
				questionId: 't1',
				symbolId: 'ru-a',
				correct: true,
				hintUsed: false,
				presses: ctx.presses,
				timingSummary: 'good',
				averageQualityScore: 1,
			},
		})
		expect(ctx.state).toBe('feedbackCorrect')
		ctx = reduceTransmitMachine(ctx, { type: 'ADVANCE' })
		expect(ctx.state).toBe('finished')
	})

	test('reset and backspace do not require evaluate', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, { type: 'START', questions })
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 1 })
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dash', durationMs: 300, quality: 'good' },
		})
		ctx = reduceTransmitMachine(ctx, { type: 'BACKSPACE' })
		expect(ctx.presses).toHaveLength(0)
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 2 })
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dot', durationMs: 100, quality: 'good' },
		})
		ctx = reduceTransmitMachine(ctx, { type: 'RESET_INPUT' })
		expect(ctx.presses).toHaveLength(0)
		expect(ctx.answered).toHaveLength(0)
	})

	test('discard open press on cleanup', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, { type: 'START', questions })
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 10 })
		ctx = reduceTransmitMachine(ctx, { type: 'DISCARD_OPEN_PRESS' })
		expect(ctx.keyDownAt).toBeNull()
		expect(ctx.presses).toHaveLength(0)
		expect(ctx.state).toBe('ready')
	})

	test('retry replaces answered attempt in session totals', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, { type: 'START', questions })
		ctx = reduceTransmitMachine(ctx, { type: 'KEY_DOWN', now: 1 })
		ctx = reduceTransmitMachine(ctx, {
			type: 'KEY_UP',
			press: { element: 'dash', durationMs: 300, quality: 'good' },
		})
		ctx = reduceTransmitMachine(ctx, { type: 'HINT' })
		ctx = reduceTransmitMachine(ctx, {
			type: 'EVALUATE',
			record: {
				questionId: 't1',
				symbolId: 'ru-a',
				correct: false,
				hintUsed: true,
				presses: ctx.presses,
				timingSummary: 'needsPractice',
				averageQualityScore: 0.4,
			},
		})
		expect(ctx.answered).toHaveLength(1)
		ctx = reduceTransmitMachine(ctx, { type: 'RETRY' })
		expect(ctx.state).toBe('retrying')
		expect(ctx.answered).toHaveLength(0)
		expect(ctx.hintUsed).toBe(true)
	})

	test('cancel finishes session path', () => {
		let ctx = createInitialTransmitContext()
		ctx = reduceTransmitMachine(ctx, { type: 'START', questions })
		ctx = reduceTransmitMachine(ctx, { type: 'CANCEL' })
		expect(ctx.state).toBe('cancelled')
	})
})
