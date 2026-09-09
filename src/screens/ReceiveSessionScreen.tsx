/**
 * Receive session — state-machine driven listening practice.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
	buildReceiveSessionResult,
	canAnswer,
	canReplay,
	createInitialReceiveContext,
	currentQuestion,
	expandReceiveOptionPool,
	generateReceiveQuestions,
	pickNextSymbol,
	reduceReceiveMachine,
	resolveKeyboardAnswerSymbolId,
	type ReceiveMachineContext,
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
	const playbackRef = useRef(createSymbolPlaybackController())
	const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const randomRef = useRef(createSeededRandom(route.params.seed))
	const previousSymbolRef = useRef<string | null>(null)
	const settingsRef = useRef(settings)
	const ctxRef = useRef(ctx)
	const startedRef = useRef(false)
	const playGenerationRef = useRef(0)

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
	}, [])

	const playQuestion = useCallback(async (symbolId: string, asReplay: boolean) => {
		clearAutoAdvance()
		const generation = playGenerationRef.current + 1
		playGenerationRef.current = generation
		if (asReplay) {
			applyMachine({ type: 'REPLAY' })
		}
		applyMachine({ type: 'PLAY_STARTED' })
		const result = await playbackRef.current.playSymbol(
			symbolId,
			{
				characterWpm: settingsRef.current.characterWpm,
				farnsworthMultiplier: settingsRef.current.farnsworthMultiplier,
				frequencyHz: settingsRef.current.toneFrequencyHz,
			},
			setActiveElement,
		)
		// Ignore stale completions after stop/cancel or newer play request.
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
		const nextQuestion = {
			id: `receive-inf-${prev.questions.length + 1}`,
			symbolId: nextSymbol,
			optionSymbolIds: generateQuestionOptions(
				nextSymbol,
				optionPool,
				randomRef.current,
			),
		}
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
		void playQuestion(question.symbolId, false)
	}, [
		appendInfiniteQuestionIfNeeded,
		applyMachine,
		playQuestion,
		resetAnswerUi,
	])

	useEffect(() => {
		if (startedRef.current) {
			return
		}
		startedRef.current = true
		const playback = playbackRef.current
		const infinite = route.params.settings.sessionLength === 'infinite'
		const questions = generateReceiveQuestions({
			alphabet: route.params.settings.alphabet,
			symbolPool: route.params.symbolPool,
			sessionLength: route.params.settings.sessionLength,
			seed: route.params.seed,
			infinitePreviewLength: 80,
			weights: route.params.weights,
			cooldownN: route.params.cooldownN,
		})
		previousSymbolRef.current = questions[0]?.symbolId ?? null
		const started = applyMachine({
			type: 'START',
			questions,
			infinite,
		})
		const first = currentQuestion(started)
		if (first) {
			void playQuestion(first.symbolId, false)
		}
		return () => {
			clearAutoAdvance()
			playGenerationRef.current += 1
			void playback.stop()
		}
	}, [applyMachine, clearAutoAdvance, playQuestion, route.params])

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
		const result = buildReceiveSessionResult(ctx.answered)
		navigation.replace('ReceiveResult', {
			result,
			settings,
			symbolPool: route.params.symbolPool,
		})
	}, [ctx.state, ctx.answered, navigation, settings, route.params.symbolPool])

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
	const answered = ctx.answered.length
	const correctCount = ctx.answered.filter((item) => item.correct).length
	const accuracy =
		answered === 0 ? 0 : Math.round((correctCount / answered) * 100)
	const totalLabel =
		settings.sessionLength === 'infinite'
			? '∞'
			: String(settings.sessionLength)
	const playing = ctx.state === 'playing' || ctx.state === 'replaying'
	const controlsLocked = playing

	const submitChoice = async (
		selectedSymbolId: string | null,
		isCorrect: boolean,
	) => {
		const snapshot = ctxRef.current
		const current = currentQuestion(snapshot)
		if (!canAnswer(snapshot) || !current) {
			return
		}
		playGenerationRef.current += 1
		await playbackRef.current.stop()
		const now = wallTimeMs()
		const responseTimeMs =
			settings.answerMode === 'paper'
				? null
				: snapshot.awaitingAnswerStartedAt == null
					? null
					: Math.max(0, now - snapshot.awaitingAnswerStartedAt)
		applyMachine({
			type: 'ANSWER',
			selectedSymbolId,
			isCorrect,
			now,
		})
		await recordSymbolAttempt({
			expectedSymbolId: current.symbolId,
			isCorrect,
			responseTimeMs,
			answerSymbolId: selectedSymbolId ?? undefined,
		})
		if (isCorrect) {
			void Haptics.selectionAsync()
		} else {
			void Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Warning,
			)
		}
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
				{playing ? (
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
							current.symbolId,
							canReplay(ctxRef.current),
						)
					}}
					accessibilityLabel="Прослушать или повторить сигнал Морзе"
				/>
			</SurfaceCard>

			{settings.answerMode === 'choices' && question ? (
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
									void submitChoice(id, id === question.symbolId)
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
							settings.alphabet === 'RU' ? 'Буква' : 'Letter'
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
						onSubmitEditing={() => {
							const current = currentQuestion(ctxRef.current)
							if (!current || !canAnswer(ctxRef.current)) {
								return
							}
							const resolved = resolveKeyboardAnswerSymbolId(
								keyboardValue,
								settings.alphabet,
								route.params.symbolPool,
							)
							void submitChoice(
								resolved.symbolId,
								resolved.symbolId === current.symbolId,
							)
						}}
						accessibilityLabel="Поле ввода услышанного символа"
					/>
					<AppButton
						label="Ответить"
						disabled={!canAnswer(ctx)}
						onPress={() => {
							const current = currentQuestion(ctxRef.current)
							if (!current) {
								return
							}
							const resolved = resolveKeyboardAnswerSymbolId(
								keyboardValue,
								settings.alphabet,
								route.params.symbolPool,
							)
							void submitChoice(
								resolved.symbolId,
								resolved.symbolId === current.symbolId,
							)
						}}
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
								accessibilityLabel={`Ответ ${expected?.character ?? '?'}, код ${expected ? describeMorseCode(expected.code) : ''}`}
							>
								{expected?.character ?? '?'}
							</Text>
							<Text
								style={[styles.hint, { color: colors.textSecondary }]}
								accessibilityLabel={
									expected
										? `Код Морзе: ${describeMorseCode(expected.code)}`
										: undefined
								}
							>
								{expected ? sequenceToPattern(expected.code) : ''}
							</Text>
							<View style={styles.row}>
								<AppButton
									label="Правильно"
									style={styles.flex}
									onPress={() => {
										void submitChoice(
											question?.symbolId ?? null,
											true,
										)
									}}
								/>
								<AppButton
									label="Ошибка"
									variant="secondary"
									style={styles.flex}
									onPress={() => {
										void submitChoice(null, false)
									}}
								/>
							</View>
						</>
					)}
				</SurfaceCard>
			) : null}

			{ctx.state === 'feedbackWrong' && expected ? (
				<SurfaceCard>
					<Text style={[styles.status, { color: colors.textPrimary }]}>
						Правильный ответ: {expected.character}
					</Text>
					<Text
						style={[styles.hint, { color: colors.textSecondary }]}
						accessibilityLabel={`Код Морзе: ${describeMorseCode(expected.code)}`}
					>
						{sequenceToPattern(expected.code)}
					</Text>
					<View style={styles.row}>
						<AppButton
							label="Прослушать ещё раз"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								void playQuestion(expected.id, true)
							}}
						/>
						<AppButton
							label="Дальше"
							style={styles.flex}
							onPress={advanceToNextQuestion}
						/>
					</View>
				</SurfaceCard>
			) : null}

			{ctx.state === 'feedbackCorrect' && expected ? (
				<Text style={[styles.hint, { color: colors.success }]}>
					{expected.character}
				</Text>
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
				{settings.sessionLength === 'infinite' ? (
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
})
