/**
 * Receive session — state-machine driven listening practice.
 * Supports symbol | group | word | phrase | digits content kinds.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	createSeededRandom,
	generateQuestionOptions,
	getSymbolById,
	sequenceToPattern,
	symbolAttemptsFromAlignment,
	type AlignmentResult,
	type MorseElement,
} from '@/src/domain'
import { createSymbolPlaybackController } from '@/src/features/playback'
import {
	RECEIVE_FEEDBACK_CORRECT_MS,
	RECEIVE_SPACING_OPTIONS,
	RECEIVE_TONE_MAX,
	RECEIVE_TONE_MIN,
	RECEIVE_TONE_STEP,
	RECEIVE_WPM_MAX,
	RECEIVE_WPM_MIN,
	RECEIVE_WPM_STEP,
	buildInfiniteSymbolQuestion,
	buildReceiveSessionResult,
	canAnswer,
	canReplay,
	createInitialReceiveContext,
	currentQuestion,
	evaluateTextAnswer,
	expandReceiveOptionPool,
	pickNextSymbol,
	reduceReceiveMachine,
	resolveKeyboardAnswerSymbolId,
	resolveSessionQuestions,
	type ReceiveMachineContext,
	type ReceiveQuestion,
	type ReceiveSettings,
} from '@/src/features/receive'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	recordSymbolAttempt,
	saveReceiveSettings,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveSession'>

function clamp (value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

/** Screen-reader friendly Morse description (avoid raw punctuation noise). */
function describeMorseCode (code: MorseElement[]): string {
	return code
		.map((element) => (element === 'dot' ? 'точка' : 'тире'))
		.join(' ')
}

function isMultiCharQuestion (question: ReceiveQuestion): boolean {
	return question.contentKind !== 'symbol'
}

function allowDigitsForQuestion (question: ReceiveQuestion, settings: ReceiveSettings): boolean {
	return (
		question.contentKind === 'digits' ||
		(question.contentKind === 'group' && settings.includeMixedDigits)
	)
}

/** Visual diff chips from alignment steps. */
function AlignmentDiff ({
	alignment,
	colors,
}: {
	alignment: AlignmentResult
	colors: { textPrimary: string; success: string; danger: string; textTertiary: string }
}) {
	return (
		<View style={styles.diffRow}>
			{alignment.steps.map((step, index) => {
				const label =
					step.operation === 'extra'
						? step.answerChar ?? '·'
						: step.targetChar ?? '·'
				const color =
					step.operation === 'match'
						? colors.success
						: step.operation === 'extra'
							? colors.textTertiary
							: colors.danger
				return (
					<Text
						key={`${index}-${step.operation}-${label}`}
						style={[styles.diffChar, { color }]}
					>
						{label === ' ' ? '␣' : label}
					</Text>
				)
			})}
		</View>
	)
}

export function ReceiveSessionScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const [settings, setSettings] = useState<ReceiveSettings>(
		route.params.settings,
	)
	const [ctx, setCtx] = useState<ReceiveMachineContext>(
		createInitialReceiveContext(),
	)
	const [keyboardValue, setKeyboardValue] = useState('')
	const [paperRevealed, setPaperRevealed] = useState(false)
	const [activeElement, setActiveElement] = useState(-1)
	const [activeCharacterIndex, setActiveCharacterIndex] = useState(-1)
	const playbackRef = useRef(createSymbolPlaybackController())
	const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const randomRef = useRef(createSeededRandom(route.params.seed))
	const previousSymbolRef = useRef<string | null>(null)
	const settingsRef = useRef(settings)
	const ctxRef = useRef(ctx)
	const startedRef = useRef(false)
	const playGenerationRef = useRef(0)

	// Resolve session once from route params (avoids setState-in-effect for blockers).
	const resolvedSession = useMemo(
		() =>
			resolveSessionQuestions({
				settings: route.params.settings,
				symbolPool: route.params.symbolPool,
				seed: route.params.seed,
				weights: route.params.weights,
				cooldownN: route.params.cooldownN,
				retryItems: route.params.retryItems,
				infinitePreviewLength: 80,
			}),
		[route.params],
	)
	const startError =
		resolvedSession.blockedReason ??
		(resolvedSession.questions.length === 0
			? 'Не удалось собрать сессию. Измените настройки.'
			: null)

	useEffect(() => {
		settingsRef.current = settings
	}, [settings])

	useEffect(() => {
		ctxRef.current = ctx
	}, [ctx])

	const applyMachine = useCallback(
		(event: Parameters<typeof reduceReceiveMachine>[1]) => {
			const next = reduceReceiveMachine(ctxRef.current, event)
			ctxRef.current = next
			setCtx(next)
			return next
		},
		[],
	)

	const clearAutoAdvance = useCallback(() => {
		if (autoAdvanceRef.current != null) {
			clearTimeout(autoAdvanceRef.current)
			autoAdvanceRef.current = null
		}
	}, [])

	const resetAnswerUi = useCallback(() => {
		setKeyboardValue('')
		setPaperRevealed(false)
		setActiveCharacterIndex(-1)
		setActiveElement(-1)
	}, [])

	const playQuestion = useCallback(async (
		question: ReceiveQuestion,
		asReplay: boolean,
		playbackOverride?: { farnsworthMultiplier: number },
	) => {
		clearAutoAdvance()
		const generation = playGenerationRef.current + 1
		playGenerationRef.current = generation
		if (asReplay) {
			applyMachine({ type: 'REPLAY' })
		}
		applyMachine({ type: 'PLAY_STARTED' })

		const timing = {
			characterWpm: settingsRef.current.characterWpm,
			farnsworthMultiplier:
				playbackOverride?.farnsworthMultiplier ??
				settingsRef.current.farnsworthMultiplier,
			frequencyHz: settingsRef.current.toneFrequencyHz,
		}

		const result = isMultiCharQuestion(question)
			? await playbackRef.current.playText(
				question.text,
				settingsRef.current.alphabet,
				timing,
				setActiveCharacterIndex,
			)
			: await playbackRef.current.playSymbol(
				question.symbolId,
				timing,
				setActiveElement,
			)

		if (playGenerationRef.current !== generation) {
			return
		}
		if (!result.ok) {
			applyMachine({
				type: 'PLAY_FAILED',
				error: result.error,
				now: wallTimeMs(),
			})
			return
		}
		applyMachine({ type: 'PLAY_FINISHED', now: wallTimeMs() })
	}, [applyMachine, clearAutoAdvance])

	const appendInfiniteQuestionIfNeeded = useCallback(() => {
		const prev = ctxRef.current
		if (!prev.infinite) {
			return
		}
		if (prev.index + 1 < prev.questions.length) {
			return
		}
		const nextSymbol = pickNextSymbol(
			route.params.symbolPool,
			previousSymbolRef.current,
			randomRef.current,
		)
		previousSymbolRef.current = nextSymbol
		const optionPool = expandReceiveOptionPool(
			settingsRef.current.alphabet,
			route.params.symbolPool,
		)
		const nextQuestion = buildInfiniteSymbolQuestion({
			id: `receive-inf-${prev.questions.length + 1}`,
			symbolId: nextSymbol,
			optionSymbolIds: generateQuestionOptions(
				nextSymbol,
				optionPool,
				randomRef.current,
			),
		})
		const next = {
			...prev,
			questions: [...prev.questions, nextQuestion],
		}
		ctxRef.current = next
		setCtx(next)
	}, [route.params.symbolPool])

	const advanceToNextQuestion = useCallback(() => {
		resetAnswerUi()
		appendInfiniteQuestionIfNeeded()
		const next = applyMachine({ type: 'ADVANCE' })
		if (next.state !== 'preparing') {
			return
		}
		const question = currentQuestion(next)
		if (!question) {
			return
		}
		void playQuestion(question, false)
	}, [
		appendInfiniteQuestionIfNeeded,
		applyMachine,
		playQuestion,
		resetAnswerUi,
	])

	useEffect(() => {
		if (startedRef.current || startError) {
			return
		}
		startedRef.current = true
		const playback = playbackRef.current
		const infinite =
			route.params.settings.sessionLength === 'infinite' &&
			route.params.settings.contentKind === 'symbol'
		previousSymbolRef.current =
			resolvedSession.questions[0]?.symbolId ?? null
		const started = applyMachine({
			type: 'START',
			questions: resolvedSession.questions,
			infinite,
		})
		const first = currentQuestion(started)
		if (first) {
			void playQuestion(first, false)
		}
		return () => {
			clearAutoAdvance()
			playGenerationRef.current += 1
			void playback.stop()
		}
	}, [
		applyMachine,
		clearAutoAdvance,
		playQuestion,
		resolvedSession.questions,
		route.params.settings.contentKind,
		route.params.settings.sessionLength,
		startError,
	])

	useEffect(() => {
		if (ctx.state !== 'feedbackCorrect') {
			return
		}
		clearAutoAdvance()
		autoAdvanceRef.current = setTimeout(() => {
			advanceToNextQuestion()
		}, RECEIVE_FEEDBACK_CORRECT_MS)
		return clearAutoAdvance
	}, [advanceToNextQuestion, clearAutoAdvance, ctx.state])

	useEffect(() => {
		if (ctx.state !== 'finished' && ctx.state !== 'cancelled') {
			return
		}
		playGenerationRef.current += 1
		void playbackRef.current.stop()
		const result = buildReceiveSessionResult(ctx.answered, ctx.questions)
		navigation.replace('ReceiveResult', {
			result,
			settings,
			symbolPool: route.params.symbolPool,
			weights: route.params.weights,
		})
	}, [ctx.state, ctx.answered, ctx.questions, navigation, settings, route.params.symbolPool, route.params.weights])

	useFocusEffect(
		useCallback(() => {
			const playback = playbackRef.current
			return () => {
				clearAutoAdvance()
				playGenerationRef.current += 1
				void playback.stop()
			}
		}, [clearAutoAdvance]),
	)

	const question = currentQuestion(ctx)
	const expected = question ? getSymbolById(question.symbolId) : null
	const lastAnswer = ctx.answered[ctx.answered.length - 1] ?? null
	const answered = ctx.answered.length
	const correctCount = ctx.answered.filter((item) => item.correct).length
	const accuracy =
		answered === 0 ? 0 : Math.round((correctCount / answered) * 100)
	const totalLabel =
		settings.sessionLength === 'infinite'
			? '∞'
			: String(
				route.params.retryItems?.length
					? route.params.retryItems.length
					: settings.sessionLength,
			)
	const playing = ctx.state === 'playing' || ctx.state === 'replaying'
	const controlsLocked = playing
	const multiChar = question ? isMultiCharQuestion(question) : false

	const recordAttemptsForAnswer = async (input: {
		question: ReceiveQuestion
		isCorrect: boolean
		selectedSymbolId: string | null
		responseTimeMs: number | null
		alignment: AlignmentResult | null
		paperSelfCheck: boolean
	}) => {
		if (input.paperSelfCheck) {
			// Paper self-check: do not invent per-symbol stats.
			return
		}
		if (input.alignment && isMultiCharQuestion(input.question)) {
			const attempts = symbolAttemptsFromAlignment(
				input.alignment,
				settings.alphabet,
				allowDigitsForQuestion(input.question, settings),
			)
			for (const attempt of attempts) {
				await recordSymbolAttempt({
					expectedSymbolId: attempt.expectedSymbolId,
					isCorrect: attempt.isCorrect,
					responseTimeMs: null,
					answerSymbolId: attempt.answerSymbolId ?? undefined,
				})
			}
			return
		}
		await recordSymbolAttempt({
			expectedSymbolId: input.question.symbolId,
			isCorrect: input.isCorrect,
			responseTimeMs: input.responseTimeMs,
			answerSymbolId: input.selectedSymbolId ?? undefined,
		})
	}

	const submitAnswer = async (input: {
		selectedSymbolId: string | null
		isCorrect: boolean
		answeredText?: string | null
		characterMatches?: number
		characterTotal?: number
		alignment?: AlignmentResult | null
		paperSelfCheck?: boolean
	}) => {
		const snapshot = ctxRef.current
		const current = currentQuestion(snapshot)
		if (!canAnswer(snapshot) || !current) {
			return
		}
		playGenerationRef.current += 1
		await playbackRef.current.stop()
		const now = wallTimeMs()
		const responseTimeMs =
			settings.answerMode === 'paper' || input.paperSelfCheck
				? null
				: snapshot.awaitingAnswerStartedAt == null
					? null
					: Math.max(0, now - snapshot.awaitingAnswerStartedAt)

		const characterTotal =
			input.characterTotal ??
			(isMultiCharQuestion(current)
				? current.requiredSymbolIds.length
				: 1)
		const characterMatches =
			input.characterMatches ?? (input.isCorrect ? characterTotal : 0)

		applyMachine({
			type: 'ANSWER',
			selectedSymbolId: input.selectedSymbolId,
			isCorrect: input.isCorrect,
			now,
			answeredText: input.answeredText ?? null,
			characterMatches,
			characterTotal,
			alignment: input.alignment ?? null,
			paperSelfCheck: input.paperSelfCheck === true,
		})

		await recordAttemptsForAnswer({
			question: current,
			isCorrect: input.isCorrect,
			selectedSymbolId: input.selectedSymbolId,
			responseTimeMs,
			alignment: input.alignment ?? null,
			paperSelfCheck: input.paperSelfCheck === true,
		})

		if (input.isCorrect) {
			void Haptics.selectionAsync()
		} else {
			void Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Warning,
			)
		}
	}

	const submitKeyboard = () => {
		const current = currentQuestion(ctxRef.current)
		if (!current || !canAnswer(ctxRef.current)) {
			return
		}
		if (isMultiCharQuestion(current)) {
			const evaluated = evaluateTextAnswer(
				current.text,
				keyboardValue,
				settings.alphabet,
				allowDigitsForQuestion(current, settings),
			)
			void submitAnswer({
				selectedSymbolId: evaluated.itemCorrect
					? current.symbolId
					: null,
				isCorrect: evaluated.itemCorrect,
				answeredText: evaluated.normalizedAnswer,
				characterMatches: evaluated.alignment.matches,
				characterTotal: evaluated.alignment.targetLength,
				alignment: evaluated.alignment,
			})
			return
		}
		const resolved = resolveKeyboardAnswerSymbolId(
			keyboardValue,
			settings.alphabet,
			route.params.symbolPool,
		)
		void submitAnswer({
			selectedSymbolId: resolved.symbolId,
			isCorrect: resolved.symbolId === current.symbolId,
			answeredText: resolved.character,
			characterMatches: resolved.symbolId === current.symbolId ? 1 : 0,
			characterTotal: 1,
		})
	}

	const playBreakdown = () => {
		const current = currentQuestion(ctxRef.current)
		if (!current) {
			return
		}
		const bumped = Math.max(
			settingsRef.current.farnsworthMultiplier * 2,
			3,
		)
		void playQuestion(current, true, { farnsworthMultiplier: bumped })
	}

	const onBackAttempt = useCallback(() => {
		const snapshot = ctxRef.current
		if (snapshot.answered.length === 0) {
			playGenerationRef.current += 1
			void playbackRef.current.stop()
			navigation.goBack()
			return
		}
		Alert.alert('Завершить тренировку?', undefined, [
			{ text: 'Продолжить', style: 'cancel' },
			{
				text: 'Завершить',
				style: 'destructive',
				onPress: () => {
					applyMachine({ type: 'CANCEL' })
				},
			},
		])
	}, [applyMachine, navigation])

	useEffect(() => {
		navigation.setOptions({
			gestureEnabled: false,
			headerBackVisible: true,
		})
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (
				ctxRef.current.state === 'finished' ||
				ctxRef.current.state === 'cancelled'
			) {
				return
			}
			event.preventDefault()
			onBackAttempt()
		})
		return unsubscribe
	}, [navigation, onBackAttempt])

	const statusLabel =
		ctx.state === 'playing' || ctx.state === 'replaying'
			? 'Слушай'
			: ctx.state === 'awaitingAnswer'
				? 'Что прозвучало?'
				: ctx.state === 'feedbackCorrect'
					? 'Правильно'
					: ctx.state === 'feedbackWrong'
						? 'Ошибка'
						: 'Готовим сигнал…'

	const liveUpdate = async (patch: Partial<ReceiveSettings>) => {
		if (controlsLocked) {
			return
		}
		const next = { ...settings, ...patch }
		setSettings(next)
		await saveReceiveSettings(next)
	}

	if (startError) {
		return (
			<Screen contentStyle={styles.content}>
				<Text style={[styles.status, { color: colors.danger }]}>
					{startError}
				</Text>
				<AppButton
					label="Назад к настройкам"
					onPress={() => navigation.goBack()}
				/>
			</Screen>
		)
	}

	return (
		<Screen contentStyle={styles.content}>
			<View style={styles.headerRow}>
				<Text style={[styles.progress, { color: colors.textPrimary }]}>
					{Math.min(ctx.index + 1, Math.max(ctx.questions.length, 1))} /{' '}
					{totalLabel}
				</Text>
				<Text style={[styles.accuracy, { color: colors.textSecondary }]}>
					Accuracy {accuracy}%
				</Text>
			</View>

			<SurfaceCard style={styles.main}>
				<Text style={[styles.status, { color: colors.textPrimary }]}>
					{statusLabel}
				</Text>
				{playing && !multiChar ? (
					<Text
						style={[styles.hint, { color: colors.textSecondary }]}
						accessibilityLabel={
							activeElement >= 0
								? `Элемент сигнала ${activeElement + 1}`
								: 'Идёт воспроизведение'
						}
					>
						{activeElement >= 0 ? '●' : '○'} сигнал
					</Text>
				) : null}
				{playing && multiChar && question ? (
					<View style={styles.breakdownRow}>
						{question.requiredSymbolIds.map((id, index) => {
							const ch = getSymbolById(id)?.character ?? '?'
							const active = activeCharacterIndex === index
							return (
								<Text
									key={`${id}-${index}`}
									style={[
										styles.breakdownChar,
										{
											color: active
												? colors.primary
												: colors.textSecondary,
										},
									]}
								>
									{ch}
								</Text>
							)
						})}
					</View>
				) : null}
				{ctx.lastError ? (
					<Text style={[styles.error, { color: colors.danger }]}>
						{ctx.lastError}
					</Text>
				) : null}
				<AppButton
					label={playing ? 'Играет…' : '▶ Прослушать / ещё раз'}
					disabled={
						playing ||
						(!canReplay(ctx) && ctx.state !== 'awaitingAnswer')
					}
					onPress={() => {
						const current = currentQuestion(ctxRef.current)
						if (!current) {
							return
						}
						void playQuestion(
							current,
							canReplay(ctxRef.current),
						)
					}}
					accessibilityLabel="Прослушать или повторить сигнал Морзе"
				/>
			</SurfaceCard>

			{settings.answerMode === 'choices' &&
			question &&
			!multiChar ? (
				<View style={styles.options}>
					{question.optionSymbolIds.map((id) => {
						const symbol = getSymbolById(id)
						if (!symbol) {
							return null
						}
						const selected = ctx.selectedSymbolId === id
						const showCorrect =
							ctx.state === 'feedbackWrong' &&
							id === question.symbolId
						return (
							<AppButton
								key={id}
								label={`${symbol.character}${showCorrect ? ' ✓' : ''}${selected && ctx.state === 'feedbackWrong' ? ' ✕' : ''}`}
								variant={showCorrect ? 'primary' : 'secondary'}
								disabled={!canAnswer(ctx)}
								onPress={() => {
									void submitAnswer({
										selectedSymbolId: id,
										isCorrect: id === question.symbolId,
										answeredText: symbol.character,
										characterMatches:
											id === question.symbolId ? 1 : 0,
										characterTotal: 1,
									})
								}}
								accessibilityLabel={`Вариант ответа ${symbol.character}${selected ? ', выбран' : ''}`}
								style={styles.option}
							/>
						)
					})}
				</View>
			) : null}

			{settings.answerMode === 'keyboard' ? (
				<SurfaceCard style={styles.keyboardCard}>
					<TextInput
						value={keyboardValue}
						onChangeText={setKeyboardValue}
						autoCapitalize="characters"
						autoCorrect={false}
						autoFocus
						editable={canAnswer(ctx)}
						placeholder={
							multiChar
								? settings.contentKind === 'phrase'
									? 'Текст'
									: settings.contentKind === 'digits'
										? 'Цифры'
										: 'Ответ'
								: settings.alphabet === 'RU'
									? 'Буква'
									: 'Letter'
						}
						placeholderTextColor={colors.textTertiary}
						style={[
							styles.input,
							{
								color: colors.textPrimary,
								borderColor: colors.border,
								backgroundColor: colors.surfaceMuted,
							},
						]}
						onSubmitEditing={submitKeyboard}
						accessibilityLabel="Поле ввода услышанного ответа"
					/>
					<AppButton
						label="Ответить"
						disabled={!canAnswer(ctx)}
						onPress={submitKeyboard}
					/>
				</SurfaceCard>
			) : null}

			{settings.answerMode === 'paper' ? (
				<SurfaceCard style={styles.keyboardCard}>
					{!paperRevealed ? (
						<AppButton
							label="Показать ответ"
							disabled={!canAnswer(ctx)}
							onPress={() => setPaperRevealed(true)}
						/>
					) : (
						<>
							<Text
								style={[styles.status, { color: colors.textPrimary }]}
								accessibilityLabel={`Ответ ${question?.text ?? expected?.character ?? '?'}`}
							>
								{question?.text ?? expected?.character ?? '?'}
							</Text>
							{!multiChar && expected ? (
								<Text
									style={[styles.hint, { color: colors.textSecondary }]}
									accessibilityLabel={`Код Морзе: ${describeMorseCode(expected.code)}`}
								>
									{sequenceToPattern(expected.code)}
								</Text>
							) : null}
							<View style={styles.row}>
								<AppButton
									label="Всё правильно"
									style={styles.flex}
									onPress={() => {
										void submitAnswer({
											selectedSymbolId:
												question?.symbolId ?? null,
											isCorrect: true,
											answeredText: question?.text ?? null,
											characterMatches:
												question?.requiredSymbolIds.length ?? 1,
											characterTotal:
												question?.requiredSymbolIds.length ?? 1,
											paperSelfCheck: true,
										})
									}}
								/>
								<AppButton
									label="Есть ошибки"
									variant="secondary"
									style={styles.flex}
									onPress={() => {
										void submitAnswer({
											selectedSymbolId: null,
											isCorrect: false,
											answeredText: null,
											characterMatches: 0,
											characterTotal:
												question?.requiredSymbolIds.length ?? 1,
											paperSelfCheck: true,
										})
									}}
								/>
							</View>
						</>
					)}
				</SurfaceCard>
			) : null}

			{ctx.state === 'feedbackWrong' && question ? (
				<SurfaceCard style={styles.feedbackCard}>
					<Text style={[styles.status, { color: colors.textPrimary }]}>
						Правильный ответ: {question.text}
					</Text>
					{lastAnswer?.answeredText ? (
						<Text style={[styles.hint, { color: colors.textSecondary }]}>
							Ваш ответ: {lastAnswer.answeredText}
						</Text>
					) : null}
					{lastAnswer?.alignment ? (
						<AlignmentDiff
							alignment={lastAnswer.alignment}
							colors={colors}
						/>
					) : !multiChar && expected ? (
						<Text
							style={[styles.hint, { color: colors.textSecondary }]}
							accessibilityLabel={`Код Морзе: ${describeMorseCode(expected.code)}`}
						>
							{sequenceToPattern(expected.code)}
						</Text>
					) : null}
					<View style={styles.row}>
						<AppButton
							label="Прослушать ещё раз"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								void playQuestion(question, true)
							}}
						/>
						{multiChar ? (
							<AppButton
								label="Разобрать по буквам"
								variant="secondary"
								style={styles.flex}
								onPress={playBreakdown}
							/>
						) : null}
					</View>
					<AppButton
						label="Дальше"
						onPress={advanceToNextQuestion}
					/>
				</SurfaceCard>
			) : null}

			{ctx.state === 'feedbackCorrect' && question ? (
				<SurfaceCard style={styles.feedbackCard}>
					<Text style={[styles.hint, { color: colors.success }]}>
						{question.text}
					</Text>
					{multiChar ? (
						<AppButton
							label="Разобрать сигнал"
							variant="secondary"
							onPress={playBreakdown}
						/>
					) : null}
				</SurfaceCard>
			) : null}

			<SurfaceCard style={styles.liveControls}>
				<Text style={[styles.hint, { color: colors.textSecondary }]}>
					Живые настройки (между вопросами). Точки и тире остаются на
					той же скорости, увеличиваются только паузы между символами.
				</Text>
				<View style={styles.row}>
					<AppButton
						label={`WPM ${settings.characterWpm} −`}
						variant="secondary"
						disabled={controlsLocked}
						style={styles.flex}
						accessibilityLabel={`Скорость ${settings.characterWpm} WPM, уменьшить`}
						onPress={() => {
							void liveUpdate({
								characterWpm: clamp(
									settings.characterWpm - RECEIVE_WPM_STEP,
									RECEIVE_WPM_MIN,
									RECEIVE_WPM_MAX,
								),
							})
						}}
					/>
					<AppButton
						label="+"
						variant="secondary"
						disabled={controlsLocked}
						style={styles.flex}
						accessibilityLabel="Увеличить скорость WPM"
						onPress={() => {
							void liveUpdate({
								characterWpm: clamp(
									settings.characterWpm + RECEIVE_WPM_STEP,
									RECEIVE_WPM_MIN,
									RECEIVE_WPM_MAX,
								),
							})
						}}
					/>
				</View>
				<View style={styles.wrap}>
					{RECEIVE_SPACING_OPTIONS.map((value) => (
						<AppButton
							key={value}
							label={value === 1 ? 'паузы ×1' : `×${value}`}
							variant={
								settings.farnsworthMultiplier === value
									? 'primary'
									: 'secondary'
							}
							disabled={controlsLocked}
							style={styles.chip}
							accessibilityLabel={`Интервалы ${value === 1 ? 'обычные' : `${value} раз`}, ${settings.farnsworthMultiplier === value ? 'выбрано' : 'не выбрано'}`}
							onPress={() => {
								void liveUpdate({ farnsworthMultiplier: value })
							}}
						/>
					))}
				</View>
				<View style={styles.row}>
					<AppButton
						label={`${settings.toneFrequencyHz} Hz −`}
						variant="secondary"
						disabled={controlsLocked}
						style={styles.flex}
						accessibilityLabel={`Тон ${settings.toneFrequencyHz} герц, уменьшить`}
						onPress={() => {
							void liveUpdate({
								toneFrequencyHz: clamp(
									settings.toneFrequencyHz - RECEIVE_TONE_STEP,
									RECEIVE_TONE_MIN,
									RECEIVE_TONE_MAX,
								),
							})
						}}
					/>
					<AppButton
						label="+"
						variant="secondary"
						disabled={controlsLocked}
						style={styles.flex}
						accessibilityLabel="Увеличить частоту тона"
						onPress={() => {
							void liveUpdate({
								toneFrequencyHz: clamp(
									settings.toneFrequencyHz + RECEIVE_TONE_STEP,
									RECEIVE_TONE_MIN,
									RECEIVE_TONE_MAX,
								),
							})
						}}
					/>
				</View>
				{settings.sessionLength === 'infinite' &&
				settings.contentKind === 'symbol' ? (
					<AppButton
						label="Завершить сессию"
						variant="secondary"
						onPress={() => applyMachine({ type: 'FINISH' })}
					/>
				) : null}
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
		gap: spacing.sm,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	progress: {
		...typography.title,
	},
	accuracy: {
		...typography.bodyStrong,
	},
	main: {
		gap: spacing.sm,
	},
	status: {
		...typography.subtitle,
	},
	error: {
		...typography.caption,
	},
	hint: {
		...typography.caption,
	},
	options: {
		gap: spacing.sm,
	},
	option: {
		alignSelf: 'stretch',
	},
	keyboardCard: {
		gap: spacing.sm,
	},
	feedbackCard: {
		gap: spacing.sm,
	},
	input: {
		minHeight: 52,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: spacing.md,
		...typography.title,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flex: {
		flex: 1,
	},
	liveControls: {
		gap: spacing.sm,
	},
	wrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minWidth: 72,
	},
	diffRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
	},
	diffChar: {
		...typography.bodyStrong,
		fontSize: 20,
	},
	breakdownRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	breakdownChar: {
		...typography.title,
	},
})
