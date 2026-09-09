import { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'

import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	buildLessonResult,
	generateLessonSession,
	getCourseById,
	getLessonById,
	getSymbolById,
	type LessonQuestionResult,
} from '@/src/domain'
import { getMorseAudioService } from '@/src/features/morseAudio'
import { createAudioGate } from '@/src/features/learning/audioGate'
import { saveLessonResultAndProgress } from '@/src/features/learning/progress'
import type { RootStackParamList } from '@/src/navigation/types'
import { getLearningProgress, getUserPreferences } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>

type Stage = 'intro' | 'quiz'

export function LessonScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const [loading, setLoading] = useState(true)
	const [stage, setStage] = useState<Stage>('intro')
	const [introIndex, setIntroIndex] = useState(0)
	const [activeElementIndex, setActiveElementIndex] = useState(-1)
	const [courseId, setCourseId] = useState<'ru-main' | 'latin-main'>('ru-main')
	const [lessonId, setLessonId] = useState('ru-lesson-1')
	const [questionIndex, setQuestionIndex] = useState(0)
	const [busy, setBusy] = useState(false)
	const [feedback, setFeedback] = useState<{
		selected: string | null
		correct: string
		isCorrect: boolean
	} | null>(null)
	const [results, setResults] = useState<LessonQuestionResult[]>([])
	const prefsRef = useRef({
		targetWpm: 15,
		farnsworthMultiplier: 1.5,
		toneFrequencyHz: 600,
	})
	const timersRef = useRef<number[]>([])
	const audioGateRef = useRef(
		createAudioGate({
			stop: async () => {
				await getMorseAudioService().stop()
			},
		}),
	)

	const clearTimers = () => {
		timersRef.current.forEach((id) => clearTimeout(id))
		timersRef.current = []
	}

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				setLoading(true)
				const [progress, prefs] = await Promise.all([
					getLearningProgress(),
					getUserPreferences(),
				])
				if (!active) {
					return
				}
				prefsRef.current = {
					targetWpm: prefs.targetWpm,
					farnsworthMultiplier: prefs.farnsworthMultiplier,
					toneFrequencyHz: prefs.toneFrequencyHz,
				}
				setCourseId(progress.currentCourseId as 'ru-main' | 'latin-main')
				setLessonId(progress.currentLessonId)
				setIntroIndex(0)
				setQuestionIndex(0)
				setResults([])
				setFeedback(null)
				setStage('intro')
				setLoading(false)
			})()
			return () => {
				active = false
				clearTimers()
				void getMorseAudioService().stop()
			}
		}, []),
	)

	const lesson = getLessonById(lessonId)
	const course = getCourseById(courseId)
	const session = useMemo(() => {
		if (!lesson) {
			return null
		}
		const seed = lesson.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
		return generateLessonSession(lesson, lesson.reviewSymbolIds, seed)
	}, [lesson])

	const introSymbolId = lesson?.newSymbolIds[introIndex] ?? null
	const question = session?.questions[questionIndex]

	const runSymbolPlayback = async (symbolId: string) => {
		const symbol = getSymbolById(symbolId)
		if (!symbol) {
			return
		}
		clearTimers()
		setActiveElementIndex(-1)
		const base = prefsRef.current
		for (let i = 0; i < symbol.code.length; i += 1) {
			const id = setTimeout(() => {
				setActiveElementIndex(i)
			}, i * (base.targetWpm >= 15 ? 260 : 320))
			timersRef.current.push(id as unknown as number)
		}
		await audioGateRef.current.playReplacing(async () => {
			await getMorseAudioService().playCode(symbol.code, {
				characterWpm: base.targetWpm,
				farnsworthMultiplier: base.farnsworthMultiplier,
				frequencyHz: base.toneFrequencyHz,
			})
		})
		setActiveElementIndex(-1)
	}

	const submitAnswer = async (selectedSymbolId: string) => {
		if (!question || busy) {
			return
		}
		await getMorseAudioService().stop()
		const isCorrect = selectedSymbolId === question.symbolId
		if (isCorrect) {
			void Haptics.selectionAsync()
		} else {
			void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
		}
		setFeedback({
			selected: selectedSymbolId,
			correct: question.symbolId,
			isCorrect,
		})
		setResults((prev) => [
			...prev,
			{
				questionId: question.id,
				expectedSymbolId: question.symbolId,
				selectedSymbolId,
				correct: isCorrect,
			},
		])
	}

	const goNextQuestion = async () => {
		setFeedback(null)
		setActiveElementIndex(-1)
		if (!session || !lesson) {
			return
		}
		const next = questionIndex + 1
		if (next >= session.questions.length) {
			const finalResults = results
			const result = buildLessonResult(lesson.id, lesson.courseId, finalResults)
			await saveLessonResultAndProgress(result)
			navigation.replace('LessonResult', {
				lessonId: result.lessonId,
				courseId: result.courseId,
				correct: result.correct,
				total: result.total,
				accuracyPercent: result.accuracyPercent,
				weakSymbolIds: result.weakSymbolIds,
				passed: result.passed,
			})
			return
		}
		setQuestionIndex(next)
	}

	if (loading || !course || !lesson || !session) {
		return (
			<Screen>
				<Text style={{ color: colors.textSecondary }}>
					Загрузка урока...
				</Text>
			</Screen>
		)
	}

	if (stage === 'intro' && introSymbolId) {
		const symbol = getSymbolById(introSymbolId)
		return (
			<Screen>
				<Text style={[styles.stage, { color: colors.accent }]}>
					Знакомство
				</Text>
				<Text style={[styles.title, { color: colors.textPrimary }]}>
					{lesson.title}
				</Text>
				<Text style={[styles.body, { color: colors.textSecondary }]}>
					Новый символ {introIndex + 1} из {lesson.newSymbolIds.length}
				</Text>
				{symbol ? (
					<VisualMnemonicCard
						symbolId={symbol.id}
						activeElementIndex={activeElementIndex}
					/>
				) : null}
				<View style={styles.row}>
					<AppButton
						label={busy ? 'Играет…' : 'Прослушать'}
						onPress={async () => {
							if (busy || !symbol) {
								return
							}
							setBusy(true)
							try {
								await runSymbolPlayback(symbol.id)
							} finally {
								setBusy(false)
							}
						}}
						disabled={busy || !symbol}
						style={styles.flex}
						accessibilityLabel="Прослушать символ"
					/>
					<AppButton
						label="Дальше"
						variant="secondary"
						onPress={() => {
							if (introIndex + 1 < lesson.newSymbolIds.length) {
								setIntroIndex((v) => v + 1)
							} else {
								setStage('quiz')
							}
						}}
						style={styles.flex}
					/>
				</View>
			</Screen>
		)
	}

	const expected = question ? getSymbolById(question.symbolId) : null
	return (
		<Screen>
			<Text style={[styles.stage, { color: colors.accent }]}>
				{question?.stage === 'recognition'
					? 'Узнай символ'
					: question?.stage === 'review'
						? 'Закрепление'
						: 'Мини-проверка'}
			</Text>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Вопрос {questionIndex + 1} / {session.questions.length}
			</Text>
			<SurfaceCard style={styles.quizCard}>
				<Text style={[styles.body, { color: colors.textSecondary }]}>
					Сначала послушай сигнал, затем выбери символ.
				</Text>
				<AppButton
					label={busy ? 'Играет…' : '▶ Прослушать сигнал'}
					onPress={async () => {
						if (!question || busy) {
							return
						}
						setBusy(true)
						try {
							await runSymbolPlayback(question.symbolId)
						} finally {
							setBusy(false)
						}
					}}
					disabled={busy}
					accessibilityLabel="Прослушать сигнал вопроса"
				/>
			</SurfaceCard>

			<View style={styles.options}>
				{question?.optionSymbolIds.map((optionId) => {
					const symbol = getSymbolById(optionId)
					if (!symbol) {
						return null
					}
					const isSelected = feedback?.selected === optionId
					const isCorrect = feedback?.correct === optionId
					return (
						<AppButton
							key={optionId}
							label={`${symbol.character}${isCorrect ? ' ✓' : ''}${isSelected && !isCorrect ? ' ✕' : ''}`}
							variant={isCorrect ? 'primary' : 'secondary'}
							onPress={() => {
								void submitAnswer(optionId)
							}}
							disabled={feedback != null}
							accessibilityLabel={`Вариант ответа ${symbol.character}`}
							style={styles.option}
						/>
					)
				})}
			</View>

			{feedback && expected ? (
				<SurfaceCard>
					<Text style={[styles.body, { color: colors.textPrimary }]}>
						{feedback.isCorrect
							? 'Верно!'
							: `Неверно. Правильный ответ: ${expected.character}`}
					</Text>
					{!feedback.isCorrect ? (
						<VisualMnemonicCard symbolId={expected.id} />
					) : null}
					<View style={styles.row}>
						<AppButton
							label="Прослушать ещё раз"
							variant="secondary"
							onPress={() => {
								void runSymbolPlayback(expected.id)
							}}
							style={styles.flex}
						/>
						<AppButton
							label="Следующий вопрос"
							onPress={() => {
								void goNextQuestion()
							}}
							style={styles.flex}
						/>
					</View>
				</SurfaceCard>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	stage: {
		...typography.label,
		marginBottom: spacing.xs,
	},
	title: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	body: {
		...typography.body,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
		marginTop: spacing.md,
	},
	flex: {
		flex: 1,
	},
	quizCard: {
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	options: {
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	option: {
		alignSelf: 'stretch',
	},
})
