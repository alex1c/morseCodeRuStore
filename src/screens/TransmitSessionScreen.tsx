/**
 * Transmit session — straight-key practice driven by state machine.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Alert,
	AppState,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'

import {
	ANALYTICS_EVENTS,
	mapAlphabet,
	sessionLengthBucket,
	trackAnalyticsEvent,
	wpmBucket,
} from '@/src/analytics'
import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	classifyKeyPress,
	evaluateTransmitSequence,
	getSymbolById,
	getVisualMnemonicBySymbolId,
	qualityLabelRu,
	sequenceToPattern,
	timingSummaryLabelRu,
} from '@/src/domain'
import { setTrainingActive } from '@/src/features/ads'
import { getMorseAudioService } from '@/src/features/morseAudio'
import { createSymbolPlaybackController } from '@/src/features/playback'
import {
	TRANSMIT_AUTO_EVAL_DELAY_MS,
	buildTransmitSessionResult,
	canKey,
	createInitialTransmitContext,
	currentTransmitQuestion,
	generateTransmitQuestions,
	reduceTransmitMachine,
	type TransmitMachineContext,
	type TransmitPressRecord,
	type TransmitSettings,
} from '@/src/features/transmit'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	appendSessionRecord,
	recordTransmitAttempt,
} from '@/src/storage'
import {
	buildTransmitSessionSummary,
	createSessionId,
} from '@/src/features/session-history'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'TransmitSession'>

export function TransmitSessionScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const [settings] = useState<TransmitSettings>(route.params.settings)
	const [ctx, setCtx] = useState<TransmitMachineContext>(
		createInitialTransmitContext(),
	)
	const [showHint, setShowHint] = useState(false)
	const [showMnemonic, setShowMnemonic] = useState(false)
	const [lastQuality, setLastQuality] = useState<string | null>(null)
	const ctxRef = useRef(ctx)
	const startedRef = useRef(false)
	const autoEvalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const playbackRef = useRef(createSymbolPlaybackController())
	const evaluatingRef = useRef(false)
	const sessionStartedAtRef = useRef(wallTimeMs())
	const historyWrittenRef = useRef(false)
	const finishHandledRef = useRef(false)

	useEffect(() => {
		ctxRef.current = ctx
	}, [ctx])

	const applyMachine = useCallback(
		(event: Parameters<typeof reduceTransmitMachine>[1]) => {
			const next = reduceTransmitMachine(ctxRef.current, event)
			ctxRef.current = next
			setCtx(next)
			return next
		},
		[],
	)

	const clearAutoEval = useCallback(() => {
		if (autoEvalRef.current != null) {
			clearTimeout(autoEvalRef.current)
			autoEvalRef.current = null
		}
	}, [])

	const stopAudio = useCallback(async () => {
		clearAutoEval()
		await getMorseAudioService().stopTone()
		await playbackRef.current.stop()
		await getMorseAudioService().stop()
	}, [clearAutoEval])

	useEffect(() => {
		if (startedRef.current) {
			return
		}
		startedRef.current = true
		const questions = generateTransmitQuestions({
			alphabet: route.params.settings.alphabet,
			symbolPool: route.params.symbolPool,
			sessionLength: route.params.settings.sessionLength,
			seed: route.params.seed,
			weights: route.params.weights,
		})
		trackAnalyticsEvent(ANALYTICS_EVENTS.TRANSMIT_STARTED, {
			alphabet: mapAlphabet(route.params.settings.alphabet),
			session_length_bucket: sessionLengthBucket(
				route.params.settings.sessionLength,
			),
			wpm_bucket: wpmBucket(route.params.settings.characterWpm),
		})
		applyMachine({ type: 'START', questions })
		return () => {
			clearAutoEval()
			void stopAudio()
		}
	}, [applyMachine, clearAutoEval, route.params, stopAudio])

	useEffect(() => {
		if (ctx.state === 'cancelled') {
			if (finishHandledRef.current) {
				return
			}
			finishHandledRef.current = true
			void stopAudio()
			if (navigation.canGoBack()) {
				navigation.goBack()
			} else {
				navigation.navigate('Home')
			}
			return
		}
		if (ctx.state !== 'finished') {
			return
		}
		if (finishHandledRef.current) {
			return
		}
		finishHandledRef.current = true
		void stopAudio()
		const result = buildTransmitSessionResult(ctx.answered)
		const durationMs = Math.min(
			Math.max(0, wallTimeMs() - sessionStartedAtRef.current),
			45 * 60 * 1000,
		)
		const timingQuality =
			ctx.answered.length === 0
				? null
				: ctx.answered.reduce(
					(sum, item) => sum + item.averageQualityScore,
					0,
				) / ctx.answered.length

		void (async () => {
			if (!historyWrittenRef.current) {
				historyWrittenRef.current = true
				await appendSessionRecord(
					buildTransmitSessionSummary({
						id: createSessionId('transmit'),
						result,
						alphabet: settings.alphabet,
						durationMs,
						timingQuality,
					}),
				)
			}
			navigation.replace('TransmitResult', {
				result,
				settings,
				symbolPool: route.params.symbolPool,
			})
		})()
	}, [
		ctx.state,
		ctx.answered,
		navigation,
		settings,
		route.params.symbolPool,
		stopAudio,
	])

	useFocusEffect(
		useCallback(() => {
			setTrainingActive(true)
			return () => {
				setTrainingActive(false)
				applyMachine({ type: 'DISCARD_OPEN_PRESS' })
				void stopAudio()
			}
		}, [applyMachine, stopAudio]),
	)

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state !== 'active') {
				applyMachine({ type: 'DISCARD_OPEN_PRESS' })
				void getMorseAudioService().stopTone()
			}
		})
		return () => sub.remove()
	}, [applyMachine])

	const question = currentTransmitQuestion(ctx)
	const expected = question ? getSymbolById(question.symbolId) : null
	const hasMnemonic = question
		? Boolean(getVisualMnemonicBySymbolId(question.symbolId))
		: false

	const runEvaluate = useCallback(async () => {
		const snapshot = ctxRef.current
		const current = currentTransmitQuestion(snapshot)
		const symbol = current ? getSymbolById(current.symbolId) : null
		if (!current || !symbol || evaluatingRef.current) {
			return
		}
		if (
			snapshot.state !== 'collecting' &&
			snapshot.state !== 'ready' &&
			snapshot.state !== 'retrying'
		) {
			return
		}
		if (snapshot.presses.length === 0) {
			return
		}
		evaluatingRef.current = true
		clearAutoEval()
		await getMorseAudioService().stopTone()
		const evaluation = evaluateTransmitSequence(symbol.code, snapshot.presses)
		const record = {
			questionId: current.id,
			symbolId: current.symbolId,
			correct: evaluation.exactMatch,
			hintUsed: snapshot.hintUsed,
			presses: snapshot.presses,
			timingSummary: evaluation.timingSummary,
			averageQualityScore: evaluation.averageQualityScore,
		}
		applyMachine({ type: 'EVALUATE', record })
		await recordTransmitAttempt({
			symbolId: current.symbolId,
			isCorrect: evaluation.exactMatch,
			hintUsed: snapshot.hintUsed,
			averageQualityScore: evaluation.averageQualityScore,
		})
		evaluatingRef.current = false
	}, [applyMachine, clearAutoEval])

	const scheduleAutoEvalIfReady = useCallback(() => {
		clearAutoEval()
		const snapshot = ctxRef.current
		const current = currentTransmitQuestion(snapshot)
		const symbol = current ? getSymbolById(current.symbolId) : null
		if (!symbol) {
			return
		}
		if (snapshot.presses.length !== symbol.code.length) {
			return
		}
		autoEvalRef.current = setTimeout(() => {
			void runEvaluate()
		}, TRANSMIT_AUTO_EVAL_DELAY_MS)
	}, [clearAutoEval, runEvaluate])

	const onKeyDown = async () => {
		const snapshot = ctxRef.current
		if (!canKey(snapshot) || snapshot.keyDownAt != null) {
			return
		}
		clearAutoEval()
		applyMachine({ type: 'KEY_DOWN', now: wallTimeMs() })
		void Haptics.selectionAsync()
		try {
			await playbackRef.current.stop()
			await getMorseAudioService().startTone(settings.toneFrequencyHz)
		} catch {
			// Sidetone is best-effort; classification still works.
		}
	}

	const onKeyUp = async () => {
		const snapshot = ctxRef.current
		const startedAt = snapshot.keyDownAt
		await getMorseAudioService().stopTone()
		if (startedAt == null) {
			applyMachine({ type: 'KEY_UP', press: null })
			return
		}
		const durationMs = Math.max(0, wallTimeMs() - startedAt)
		const classified = classifyKeyPress(durationMs, settings.characterWpm)
		const press: TransmitPressRecord | null = classified.ignored
			? null
			: {
				element: classified.element!,
				durationMs: classified.durationMs,
				quality: classified.quality,
			}
		if (press) {
			setLastQuality(qualityLabelRu(press.quality))
		}
		applyMachine({ type: 'KEY_UP', press })
		scheduleAutoEvalIfReady()
	}

	const statusLabel =
		ctx.state === 'keyDown'
			? 'Держите…'
			: ctx.state === 'feedbackCorrect'
				? 'Правильно'
				: ctx.state === 'feedbackWrong'
					? 'Ошибка'
					: ctx.state === 'collecting'
						? 'Продолжайте или нажмите «Готово»'
						: 'Передайте символ'

	const sentPattern = sequenceToPattern(ctx.presses.map((p) => p.element))

	const onBackAttempt = useCallback(() => {
		if (ctxRef.current.answered.length === 0) {
			void stopAudio()
			navigation.goBack()
			return
		}
		Alert.alert('Завершить тренировку?', undefined, [
			{ text: 'Продолжить', style: 'cancel' },
			{
				text: 'Завершить',
				style: 'destructive',
				onPress: () => applyMachine({ type: 'CANCEL' }),
			},
		])
	}, [applyMachine, navigation, stopAudio])

	useEffect(() => {
		navigation.setOptions({ gestureEnabled: false })
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

	return (
		<Screen contentStyle={styles.content}>
			<View style={styles.headerRow}>
				<Text style={[styles.progress, { color: colors.textPrimary }]}>
					{Math.min(ctx.index + 1, Math.max(ctx.questions.length, 1))} /{' '}
					{settings.sessionLength}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					{settings.characterWpm} WPM
				</Text>
			</View>

			<SurfaceCard style={styles.targetCard}>
				<Text style={[styles.prompt, { color: colors.textSecondary }]}>
					Передайте:
				</Text>
				<Text style={[styles.target, { color: colors.textPrimary }]}>
					{expected?.character ?? '?'}
				</Text>
				<Text style={[styles.status, { color: colors.textSecondary }]}>
					{statusLabel}
				</Text>
				{showHint && expected ? (
					<Text
						style={[styles.hintPattern, { color: colors.primary }]}
						accessibilityLabel={`Подсказка: ${expected.code
							.map((el) => (el === 'dot' ? 'точка' : 'тире'))
							.join(' ')}`}
					>
						{sequenceToPattern(expected.code)}
					</Text>
				) : null}
			</SurfaceCard>

			<SurfaceCard>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Вы передали:
				</Text>
				<Text
					style={[styles.sent, { color: colors.textPrimary }]}
					accessibilityLabel={
						ctx.presses.length === 0
							? 'Пока ничего не передано'
							: `Передано: ${ctx.presses
								.map((p) =>
									p.element === 'dot' ? 'точка' : 'тире',
								)
								.join(' ')}`
					}
				>
					{sentPattern || '—'}
				</Text>
				{lastQuality ? (
					<Text style={[styles.meta, { color: colors.textTertiary }]}>
						Последний элемент: {lastQuality}
					</Text>
				) : null}
			</SurfaceCard>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Телеграфный ключ. Нажмите и удерживайте"
				disabled={
					!canKey(ctx) &&
					ctx.state !== 'keyDown'
				}
				onPressIn={() => {
					void onKeyDown()
				}}
				onPressOut={() => {
					void onKeyUp()
				}}
				style={[
					styles.key,
					{
						backgroundColor:
							ctx.state === 'keyDown'
								? colors.primary
								: colors.surfaceMuted,
						borderColor: colors.border,
					},
				]}
			>
				<Text
					style={[
						styles.keyLabel,
						{
							color:
								ctx.state === 'keyDown'
									? '#FFFFFF'
									: colors.textPrimary,
						},
					]}
				>
					{ctx.state === 'keyDown'
						? 'Удерживайте'
						: 'НАЖМИ И УДЕРЖИВАЙ'}
				</Text>
			</Pressable>

			<View style={styles.row}>
				<AppButton
					label="Сбросить"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						clearAutoEval()
						setLastQuality(null)
						applyMachine({ type: 'RESET_INPUT' })
					}}
				/>
				<AppButton
					label="Удалить последний"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						clearAutoEval()
						applyMachine({ type: 'BACKSPACE' })
					}}
				/>
			</View>

			<View style={styles.row}>
				<AppButton
					label="Подсказка"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						applyMachine({ type: 'HINT' })
						setShowHint(true)
					}}
				/>
				<AppButton
					label="Готово"
					style={styles.flex}
					disabled={ctx.presses.length === 0}
					onPress={() => {
						void runEvaluate()
					}}
				/>
			</View>

			{(ctx.state === 'feedbackCorrect' || ctx.state === 'feedbackWrong') &&
			expected ? (
				<SurfaceCard style={styles.feedback}>
					<Text style={[styles.status, { color: colors.textPrimary }]}>
						Вы передали: {sentPattern || '—'}
					</Text>
					{ctx.state === 'feedbackCorrect' ? (
						<Text style={[styles.status, { color: colors.success }]}>
							✓ Правильно · Ритм:{' '}
							{timingSummaryLabelRu(
								ctx.answered[ctx.answered.length - 1]
									?.timingSummary ?? 'good',
							)}
						</Text>
					) : (
						<>
							<Text style={[styles.status, { color: colors.danger }]}>
								Правильно: {sequenceToPattern(expected.code)}
							</Text>
							{hasMnemonic ? (
								<AppButton
									label="Визуальная подсказка"
									variant="secondary"
									onPress={() => setShowMnemonic((v) => !v)}
								/>
							) : null}
						</>
					)}
					<View style={styles.row}>
						<AppButton
							label="Прослушать"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								void playbackRef.current.playSymbol(expected.id, {
									characterWpm: settings.characterWpm,
									farnsworthMultiplier: 1,
									frequencyHz: settings.toneFrequencyHz,
								})
							}}
						/>
						<AppButton
							label="Попробовать ещё раз"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								setLastQuality(null)
								setShowHint(false)
								applyMachine({ type: 'RETRY' })
							}}
						/>
					</View>
					<AppButton
						label="Дальше"
						onPress={() => {
							setShowHint(false)
							setShowMnemonic(false)
							setLastQuality(null)
							applyMachine({ type: 'ADVANCE' })
						}}
					/>
					{showMnemonic ? (
						<VisualMnemonicCard symbolId={expected.id} />
					) : null}
				</SurfaceCard>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		gap: spacing.sm,
		paddingBottom: spacing.xxl,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	progress: {
		...typography.title,
	},
	meta: {
		...typography.caption,
	},
	targetCard: {
		alignItems: 'center',
		gap: spacing.xs,
	},
	prompt: {
		...typography.caption,
	},
	target: {
		fontSize: 56,
		lineHeight: 64,
		fontWeight: '700',
	},
	status: {
		...typography.bodyStrong,
	},
	hintPattern: {
		...typography.subtitle,
	},
	sent: {
		...typography.subtitle,
	},
	key: {
		minHeight: 140,
		borderRadius: 16,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
	},
	keyLabel: {
		...typography.subtitle,
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flex: {
		flex: 1,
	},
	feedback: {
		gap: spacing.sm,
	},
})
