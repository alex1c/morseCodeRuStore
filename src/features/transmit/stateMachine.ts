/**
 * Pure Transmit session state machine.
 */

import type { MorseElement } from '@/src/domain/morse'
import type {
	TransmitAnswerRecord,
	TransmitMachineState,
	TransmitPressRecord,
	TransmitQuestion,
} from './types'
import { TRANSMIT_MAX_ELEMENTS } from './constants'

export type TransmitMachineContext = {
	state: TransmitMachineState
	questions: TransmitQuestion[]
	index: number
	answered: TransmitAnswerRecord[]
	presses: TransmitPressRecord[]
	keyDownAt: number | null
	hintUsed: boolean
	lastError: string | null
}

export type TransmitMachineEvent =
	| { type: 'START'; questions: TransmitQuestion[] }
	| { type: 'KEY_DOWN'; now: number }
	| { type: 'KEY_UP'; press: TransmitPressRecord | null }
	| { type: 'HINT' }
	| { type: 'RESET_INPUT' }
	| { type: 'BACKSPACE' }
	| { type: 'EVALUATE'; record: TransmitAnswerRecord }
	| { type: 'RETRY' }
	| { type: 'ADVANCE' }
	| { type: 'CANCEL' }
	| { type: 'FINISH' }
	| { type: 'DISCARD_OPEN_PRESS' }

export function createInitialTransmitContext (): TransmitMachineContext {
	return {
		state: 'idle',
		questions: [],
		index: 0,
		answered: [],
		presses: [],
		keyDownAt: null,
		hintUsed: false,
		lastError: null,
	}
}

export function currentTransmitQuestion (
	ctx: TransmitMachineContext,
): TransmitQuestion | null {
	return ctx.questions[ctx.index] ?? null
}

export function canKey (
	ctx: TransmitMachineContext,
): boolean {
	return (
		ctx.state === 'ready' ||
		ctx.state === 'collecting' ||
		ctx.state === 'retrying'
	)
}

export function reduceTransmitMachine (
	ctx: TransmitMachineContext,
	event: TransmitMachineEvent,
): TransmitMachineContext {
	switch (event.type) {
		case 'START':
			return {
				...createInitialTransmitContext(),
				state: 'ready',
				questions: event.questions,
			}
		case 'KEY_DOWN':
			if (!canKey(ctx) || ctx.keyDownAt != null) {
				return ctx
			}
			if (ctx.presses.length >= TRANSMIT_MAX_ELEMENTS) {
				return ctx
			}
			return {
				...ctx,
				state: 'keyDown',
				keyDownAt: event.now,
				lastError: null,
			}
		case 'KEY_UP': {
			if (ctx.state !== 'keyDown' || ctx.keyDownAt == null) {
				return {
					...ctx,
					keyDownAt: null,
					state:
						ctx.presses.length > 0 ? 'collecting' : 'ready',
				}
			}
			const presses =
				event.press == null
					? ctx.presses
					: [...ctx.presses, event.press].slice(
						0,
						TRANSMIT_MAX_ELEMENTS,
					)
			return {
				...ctx,
				state: presses.length > 0 ? 'collecting' : 'ready',
				presses,
				keyDownAt: null,
			}
		}
		case 'DISCARD_OPEN_PRESS':
			if (ctx.keyDownAt == null) {
				return ctx
			}
			return {
				...ctx,
				keyDownAt: null,
				state: ctx.presses.length > 0 ? 'collecting' : 'ready',
			}
		case 'HINT':
			if (
				ctx.state !== 'ready' &&
				ctx.state !== 'collecting' &&
				ctx.state !== 'retrying' &&
				ctx.state !== 'feedbackWrong' &&
				ctx.state !== 'feedbackCorrect'
			) {
				return ctx
			}
			return { ...ctx, hintUsed: true }
		case 'RESET_INPUT':
			if (
				ctx.state !== 'ready' &&
				ctx.state !== 'collecting' &&
				ctx.state !== 'retrying' &&
				ctx.state !== 'keyDown'
			) {
				return ctx
			}
			return {
				...ctx,
				state: 'ready',
				presses: [],
				keyDownAt: null,
			}
		case 'BACKSPACE':
			if (
				(ctx.state !== 'collecting' && ctx.state !== 'ready') ||
				ctx.presses.length === 0
			) {
				return ctx
			}
			return {
				...ctx,
				presses: ctx.presses.slice(0, -1),
				state:
					ctx.presses.length <= 1 ? 'ready' : 'collecting',
			}
		case 'EVALUATE':
			if (
				ctx.state !== 'collecting' &&
				ctx.state !== 'ready' &&
				ctx.state !== 'retrying'
			) {
				return ctx
			}
			return {
				...ctx,
				state: event.record.correct
					? 'feedbackCorrect'
					: 'feedbackWrong',
				answered: [...ctx.answered, event.record],
				keyDownAt: null,
			}
		case 'RETRY':
			if (
				ctx.state !== 'feedbackWrong' &&
				ctx.state !== 'feedbackCorrect'
			) {
				return ctx
			}
			return {
				...ctx,
				state: 'retrying',
				presses: [],
				keyDownAt: null,
				// Replace previous attempt in session totals when user retries.
				answered: ctx.answered.slice(0, -1),
				hintUsed: ctx.hintUsed,
			}
		case 'ADVANCE': {
			if (
				ctx.state !== 'feedbackCorrect' &&
				ctx.state !== 'feedbackWrong' &&
				ctx.state !== 'advancing'
			) {
				return ctx
			}
			const nextIndex = ctx.index + 1
			if (nextIndex >= ctx.questions.length) {
				return {
					...ctx,
					state: 'finished',
					index: nextIndex,
					presses: [],
					keyDownAt: null,
					hintUsed: false,
				}
			}
			return {
				...ctx,
				state: 'ready',
				index: nextIndex,
				presses: [],
				keyDownAt: null,
				hintUsed: false,
			}
		}
		case 'FINISH':
			return { ...ctx, state: 'finished', keyDownAt: null }
		case 'CANCEL':
			return { ...ctx, state: 'cancelled', keyDownAt: null }
		default:
			return ctx
	}
}

export function pressesToElements (
	presses: TransmitPressRecord[],
): MorseElement[] {
	return presses.map((press) => press.element)
}
