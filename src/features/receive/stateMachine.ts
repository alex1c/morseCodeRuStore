/**
 * Pure Receive session state machine.
 * UI dispatches events; no timers live here.
 */

import type { AlignmentResult } from '@/src/domain'
import type {
	ReceiveAnswerRecord,
	ReceiveMachineState,
	ReceiveQuestion,
} from './types'

export type ReceiveMachineContext = {
	state: ReceiveMachineState
	questions: ReceiveQuestion[]
	index: number
	answered: ReceiveAnswerRecord[]
	currentReplayCount: number
	awaitingAnswerStartedAt: number | null
	selectedSymbolId: string | null
	lastError: string | null
	infinite: boolean
}

export type ReceiveMachineEvent =
	| { type: 'START'; questions: ReceiveQuestion[]; infinite: boolean }
	| { type: 'PLAY_STARTED' }
	| { type: 'PLAY_FINISHED'; now: number }
	| { type: 'PLAY_FAILED'; error: string; now: number }
	| { type: 'REPLAY' }
	| {
			type: 'ANSWER'
			selectedSymbolId: string | null
			isCorrect: boolean
			now: number
			answeredText?: string | null
			characterMatches?: number
			characterTotal?: number
			alignment?: AlignmentResult | null
			paperSelfCheck?: boolean
	  }
	| { type: 'ADVANCE' }
	| { type: 'FINISH' }
	| { type: 'CANCEL' }
	| { type: 'RESET' }

export function createInitialReceiveContext (): ReceiveMachineContext {
	return {
		state: 'idle',
		questions: [],
		index: 0,
		answered: [],
		currentReplayCount: 0,
		awaitingAnswerStartedAt: null,
		selectedSymbolId: null,
		lastError: null,
		infinite: false,
	}
}

export function reduceReceiveMachine (
	ctx: ReceiveMachineContext,
	event: ReceiveMachineEvent,
): ReceiveMachineContext {
	switch (event.type) {
		case 'RESET':
			return createInitialReceiveContext()
		case 'START':
			return {
				...createInitialReceiveContext(),
				state: 'preparing',
				questions: event.questions,
				infinite: event.infinite,
			}
		case 'PLAY_STARTED':
			if (
				ctx.state !== 'preparing' &&
				ctx.state !== 'awaitingAnswer' &&
				ctx.state !== 'feedbackWrong' &&
				ctx.state !== 'feedbackCorrect' &&
				ctx.state !== 'advancing' &&
				ctx.state !== 'replaying' &&
				ctx.state !== 'idle'
			) {
				return ctx
			}
			return {
				...ctx,
				state:
					ctx.state === 'awaitingAnswer' ||
					ctx.state === 'feedbackWrong' ||
					ctx.state === 'feedbackCorrect' ||
					ctx.state === 'replaying'
						? 'replaying'
						: 'playing',
				lastError: null,
				awaitingAnswerStartedAt: null,
			}
		case 'PLAY_FINISHED':
			if (ctx.state !== 'playing' && ctx.state !== 'replaying') {
				return ctx
			}
			return {
				...ctx,
				state: 'awaitingAnswer',
				awaitingAnswerStartedAt: event.now,
			}
		case 'PLAY_FAILED':
			return {
				...ctx,
				state: 'awaitingAnswer',
				lastError: event.error,
				awaitingAnswerStartedAt: event.now,
			}
		case 'REPLAY':
			if (
				ctx.state !== 'awaitingAnswer' &&
				ctx.state !== 'feedbackWrong' &&
				ctx.state !== 'feedbackCorrect'
			) {
				return ctx
			}
			return {
				...ctx,
				state: 'replaying',
				currentReplayCount: ctx.currentReplayCount + 1,
				awaitingAnswerStartedAt: null,
			}
		case 'ANSWER': {
			if (ctx.state !== 'awaitingAnswer') {
				return ctx
			}
			const question = ctx.questions[ctx.index]
			if (!question) {
				return ctx
			}
			const responseTimeMs =
				ctx.awaitingAnswerStartedAt == null
					? null
					: Math.max(0, event.now - ctx.awaitingAnswerStartedAt)
			// Symbol-mode callers may omit text/alignment fields — fill defaults.
			const expectedText = question.text ?? ''
			const characterTotal =
				event.characterTotal ?? 1
			const characterMatches =
				event.characterMatches ?? (event.isCorrect ? 1 : 0)
			const record: ReceiveAnswerRecord = {
				questionId: question.id,
				expectedSymbolId: question.symbolId,
				selectedSymbolId: event.selectedSymbolId,
				correct: event.isCorrect,
				responseTimeMs,
				replayCount: ctx.currentReplayCount,
				expectedText,
				answeredText:
					event.answeredText !== undefined
						? event.answeredText
						: null,
				characterMatches,
				characterTotal,
				alignment:
					event.alignment !== undefined ? event.alignment : null,
				paperSelfCheck: event.paperSelfCheck === true,
			}
			return {
				...ctx,
				state: event.isCorrect ? 'feedbackCorrect' : 'feedbackWrong',
				selectedSymbolId: event.selectedSymbolId,
				answered: [...ctx.answered, record],
				currentReplayCount: 0,
				awaitingAnswerStartedAt: null,
			}
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
			if (!ctx.infinite && nextIndex >= ctx.questions.length) {
				return {
					...ctx,
					state: 'finished',
					index: nextIndex,
					selectedSymbolId: null,
				}
			}
			return {
				...ctx,
				state: 'preparing',
				index: nextIndex,
				selectedSymbolId: null,
				currentReplayCount: 0,
				awaitingAnswerStartedAt: null,
			}
		}
		case 'FINISH':
			return {
				...ctx,
				state: 'finished',
			}
		case 'CANCEL':
			return {
				...ctx,
				state: 'cancelled',
			}
		default:
			return ctx
	}
}

export function currentQuestion (
	ctx: ReceiveMachineContext,
): ReceiveQuestion | null {
	return ctx.questions[ctx.index] ?? null
}

export function canAnswer (ctx: ReceiveMachineContext): boolean {
	return ctx.state === 'awaitingAnswer'
}

export function canReplay (ctx: ReceiveMachineContext): boolean {
	return (
		ctx.state === 'awaitingAnswer' ||
		ctx.state === 'feedbackWrong' ||
		ctx.state === 'feedbackCorrect'
	)
}
