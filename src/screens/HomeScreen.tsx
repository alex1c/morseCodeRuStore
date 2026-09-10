/**
 * Home — primary product surface (Phase 8 UX order).
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'

import { Screen } from '@/src/components/Screen'
import {
	AppButton,
	ModeCard,
	SecondaryLink,
	SurfaceCard,
} from '@/src/components/ui'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	WEEKDAY_LABELS_RU,
	addLocalDays,
	buildAdaptiveSessionPool,
	computeStreakState,
	getSymbolById,
	getLessonById,
	hasEnoughAdaptiveData,
	listWeakForDisplay,
	listMasteryForAlphabet,
	localWeekdayIndex,
	selectWeakSymbolPool,
	toLocalDateKey,
	type DailyPlan,
	type DailyState,
	type StreakState,
} from '@/src/domain'
import { buildDailyLaunch } from '@/src/features/daily'
import { ensureCourseDefaults } from '@/src/features/learning/progress'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
	type ReceiveSettings,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import {
	getDailyState,
	getReceiveSettings,
	getSymbolStatsMap,
	getTransmitSettings,
} from '@/src/storage'
import { wallTimeMs } from '@/src/utils/clock'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SymbolStatsMap } from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [lessonTitle, setLessonTitle] = useState('Урок 1')
	const [knownCount, setKnownCount] = useState(0)
	const [hasStarted, setHasStarted] = useState(false)
	const [receiveSubtitle, setReceiveSubtitle] = useState(
		'20 вопросов · 12 WPM',
	)
	const [transmitSubtitle, setTransmitSubtitle] = useState(
		'Тренировка ключа',
	)
	const [weakPreview, setWeakPreview] = useState<string[]>([])
	const [canTrainWeak, setCanTrainWeak] = useState(false)
	const [homeAlphabet, setHomeAlphabet] = useState<'RU' | 'LATIN'>('RU')
	const [statsMap, setStatsMap] = useState<SymbolStatsMap>({})
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [receiveBase, setReceiveBase] = useState<Partial<ReceiveSettings>>({})
	const [dailyState, setDailyState] = useState<DailyState | null>(null)
	const [streak, setStreak] = useState<StreakState | null>(null)
	const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [progress, receive, stats, transmit, daily] =
					await Promise.all([
						ensureCourseDefaults(preferences.selectedAlphabet),
						getReceiveSettings(),
						getSymbolStatsMap(),
						getTransmitSettings(),
						getDailyState(),
					])
				const lesson = getLessonById(progress.currentLessonId)
				if (!active) {
					return
				}
				const alphabet =
					preferences.selectedAlphabet === 'LATIN'
						? 'LATIN'
						: preferences.selectedAlphabet === 'RU'
							? 'RU'
							: receive.alphabet
				setLessonTitle(lesson?.title ?? 'Урок 1')
				setKnownCount(progress.knownSymbolIds.length)
				setHasStarted(progress.completedLessonIds.length > 0)
				setKnownIds(progress.knownSymbolIds)
				setStatsMap(stats)
				setHomeAlphabet(alphabet)
				setReceiveBase(receive)
				setDailyState(daily)
				const nextStreak = computeStreakState(daily.completedDates)
				setStreak(nextStreak)
				const launchPreview = buildDailyLaunch({
					alphabet,
					knownSymbolIds: progress.knownSymbolIds,
					statsMap: stats,
					receiveBase: receive,
				})
				setDailyPlan(launchPreview.plan)
				const lengthLabel =
					receive.sessionLength === 'infinite'
						? '∞'
						: String(receive.sessionLength)
				setReceiveSubtitle(
					`Буквы, слова и группы · ${lengthLabel} · ${receive.characterWpm} WPM`,
				)
				setTransmitSubtitle(
					`${transmit.sessionLength} символов · ${transmit.characterWpm} WPM`,
				)
				const enough = hasEnoughAdaptiveData(stats, alphabet)
				setCanTrainWeak(enough)
				if (enough) {
					const mastery = listMasteryForAlphabet(stats, alphabet)
					const weak = listWeakForDisplay(mastery, 3)
					setWeakPreview(
						weak
							.map((item) => getSymbolById(item.symbolId)?.character)
							.filter((ch): ch is string => Boolean(ch)),
					)
				} else {
					setWeakPreview([])
				}
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const startWeakHome = () => {
		const pool = selectWeakSymbolPool({
			statsMap,
			alphabet: homeAlphabet,
			knownSymbolIds: knownIds,
		})
		if (!pool.hasEnoughData) {
			navigation.navigate('Errors')
			return
		}
		const plan = buildAdaptiveSessionPool({
			statsMap,
			alphabet: homeAlphabet,
			knownSymbolIds: knownIds,
		})
		const launch = buildReceiveLaunch({
			alphabet: homeAlphabet,
			symbolPool:
				pool.symbolIds.length > 0 ? pool.symbolIds : plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: { ...receiveBase, symbolPreset: 'weak' },
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', {
			...launch,
			sessionSource: 'receive',
			sessionStartedAtMs: wallTimeMs(),
		})
	}

	const startDaily = () => {
		const launch = buildDailyLaunch({
			alphabet: homeAlphabet,
			knownSymbolIds: knownIds,
			statsMap,
			receiveBase,
		})
		navigation.navigate('ReceiveSession', {
			settings: launch.settings,
			symbolPool: launch.symbolPool,
			seed: launch.seed,
			weights: launch.weights,
			prebuiltQuestions: launch.prebuiltQuestions,
			sessionSource: 'daily',
			sessionStartedAtMs: launch.sessionStartedAtMs,
			planMeta: launch.planMeta,
		})
	}

	const completedToday = streak?.completedToday === true
	const last = dailyState?.lastCompletion
	const todayKey = toLocalDateKey()
	const weekStart = addLocalDays(todayKey, -localWeekdayIndex(todayKey))
	const completedSet = new Set(dailyState?.completedDates ?? [])
	const weekStrip = WEEKDAY_LABELS_RU.map((label, index) => {
		const key = addLocalDays(weekStart, index)
		const isFuture = key > todayKey
		const done = completedSet.has(key)
		return {
			label,
			key,
			mark: isFuture ? '—' : done ? '✓' : '○',
			isToday: key === todayKey,
		}
	})
	const streakLabel = `Серия: ${streak?.current ?? 0} дней`

	return (
		<Screen contentStyle={styles.content}>
			<View style={styles.hero}>
				<Text style={[styles.appName, { color: colors.textPrimary }]}>
					Тренажёр азбуки Морзе
				</Text>
				<Text
					style={[styles.tagline, { color: colors.textSecondary }]}
				>
					Научись принимать и передавать Морзе на слух
				</Text>
			</View>

			{/* 1. Continue learning */}
			<SurfaceCard style={styles.continueCard}>
				<Text
					style={[styles.continueEyebrow, { color: colors.accent }]}
				>
					{hasStarted ? 'Продолжить обучение' : 'Начать обучение'}
				</Text>
				<Text
					style={[styles.continueTitle, { color: colors.textPrimary }]}
				>
					{lessonTitle}
				</Text>
				<Text
					style={[
						styles.continueSubtitle,
						{ color: colors.textSecondary },
					]}
				>
					Изучено символов: {knownCount}. Короткие шаги: сначала знакомство, потом слух.
				</Text>
				<AppButton
					label={
						hasStarted
							? 'Продолжить обучение'
							: 'Начать первый урок'
					}
					onPress={() => navigation.navigate('Lesson')}
					style={styles.continueButton}
					accessibilityLabel={
						hasStarted
							? 'Продолжить обучение'
							: 'Начать первый урок'
					}
				/>
			</SurfaceCard>

			{/* 2. Daily card */}
			<SurfaceCard style={styles.continueCard}>
				{completedToday && last ? (
					<>
						<Text
							style={[styles.continueEyebrow, { color: colors.accent }]}
						>
							Сегодня выполнено
						</Text>
						<Text
							style={[styles.continueTitle, { color: colors.textPrimary }]}
						>
							{last.itemsCorrect} / {last.itemsTotal}
						</Text>
						<Text
							style={[
								styles.continueSubtitle,
								{ color: colors.textSecondary },
							]}
						>
							{last.characterAccuracyPercent == null
								? `${Math.round(
									(last.itemsCorrect /
										Math.max(last.itemsTotal, 1)) *
										100,
								)}%`
								: `${last.characterAccuracyPercent}%`}
							{' · '}
							{dailyPlan?.mixSummary ?? ''}
						</Text>
						<Text
							style={[styles.streakLine, { color: colors.primary }]}
							accessibilityLabel={streakLabel}
						>
							{streakLabel}
						</Text>
						<View style={styles.weekRow}>
							{weekStrip.map((day) => (
								<View key={day.key} style={styles.weekCell}>
									<Text
										style={[
											styles.weekLabel,
											{
												color: day.isToday
													? colors.primary
													: colors.textTertiary,
											},
										]}
									>
										{day.label}
										{day.mark}
									</Text>
								</View>
							))}
						</View>
						<AppButton
							label="Повторить"
							onPress={startDaily}
							style={styles.continueButton}
						/>
					</>
				) : (
					<>
						<Text
							style={[styles.continueEyebrow, { color: colors.accent }]}
						>
							Тренировка дня
						</Text>
						<Text
							style={[styles.continueTitle, { color: colors.textPrimary }]}
						>
							{dailyPlan?.estimateLabel ?? '≈ 5 минут'}
						</Text>
						<Text
							style={[
								styles.continueSubtitle,
								{ color: colors.textSecondary },
							]}
						>
							{dailyPlan?.mixSummary ?? 'Смешанная тренировка'}
						</Text>
						<Text
							style={[styles.streakLine, { color: colors.primary }]}
							accessibilityLabel={streakLabel}
						>
							{streakLabel}
						</Text>
						<View style={styles.weekRow}>
							{weekStrip.map((day) => (
								<View key={day.key} style={styles.weekCell}>
									<Text
										style={[
											styles.weekLabel,
											{
												color: day.isToday
													? colors.primary
													: colors.textTertiary,
											},
										]}
									>
										{day.label}
										{day.mark}
									</Text>
								</View>
							))}
						</View>
						<AppButton
							label="Начать"
							onPress={startDaily}
							style={styles.continueButton}
						/>
					</>
				)}
			</SurfaceCard>

			{/* 3. Quick Practice (promoted) */}
			<SurfaceCard style={styles.continueCard}>
				<Text
					style={[styles.continueEyebrow, { color: colors.accent }]}
				>
					Быстрая тренировка
				</Text>
				<Text
					style={[
						styles.continueSubtitle,
						{ color: colors.textSecondary },
					]}
				>
					Короткая сессия без курса — сразу к делу.
				</Text>
				<AppButton
					label="Начать"
					variant="secondary"
					onPress={() => navigation.navigate('QuickPractice')}
					style={styles.continueButton}
				/>
			</SurfaceCard>

			{/* 4. Receive / Transmit */}
			<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
				Основные режимы
			</Text>
			<View style={styles.modeGrid}>
				<ModeCard
					title="Приём на слух"
					subtitle={receiveSubtitle}
					onPress={() => navigation.navigate('Receive')}
				/>
				<ModeCard
					title="Передача"
					subtitle={transmitSubtitle}
					onPress={() => navigation.navigate('Transmit')}
				/>
			</View>

			{/* 5. Need to repeat (weak) */}
			{canTrainWeak && weakPreview.length > 0 ? (
				<SurfaceCard style={[styles.continueCard, styles.weakCard]}>
					<Text
						style={[styles.continueEyebrow, { color: colors.accent }]}
					>
						Нужно повторить
					</Text>
					<Text
						style={[styles.continueTitle, { color: colors.textPrimary }]}
					>
						{weakPreview.join(' · ')}
					</Text>
					<AppButton
						label="Тренировать слабые"
						onPress={startWeakHome}
						style={styles.continueButton}
					/>
				</SurfaceCard>
			) : null}

			{/* 6. Secondary nav */}
			<Text
				style={[
					styles.sectionLabel,
					styles.secondarySection,
					{ color: colors.textSecondary },
				]}
			>
				Ещё
			</Text>
			<SurfaceCard style={styles.secondaryCard}>
				<SecondaryLink
					label="Мои ошибки"
					onPress={() => navigation.navigate('Errors')}
				/>
				<SecondaryLink
					label="Курс"
					onPress={() => navigation.navigate('Course')}
				/>
				<SecondaryLink
					label="Статистика"
					onPress={() => navigation.navigate('Stats')}
				/>
				<SecondaryLink
					label="Переводчик"
					onPress={() => navigation.navigate('Translator')}
				/>
				<SecondaryLink
					label="Справочник"
					onPress={() => navigation.navigate('Reference')}
				/>
				<SecondaryLink
					label="Обучение"
					onPress={() => navigation.navigate('Learning')}
				/>
				<SecondaryLink
					label="Настройки"
					onPress={() => navigation.navigate('Settings')}
				/>
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
	},
	hero: {
		marginBottom: spacing.lg,
	},
	appName: {
		...typography.display,
		marginBottom: spacing.xs,
	},
	tagline: {
		...typography.body,
	},
	continueCard: {
		marginBottom: spacing.lg,
	},
	weakCard: {
		marginTop: spacing.lg,
	},
	continueEyebrow: {
		...typography.label,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: spacing.xs,
	},
	continueTitle: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	continueSubtitle: {
		...typography.caption,
		marginBottom: spacing.sm,
	},
	streakLine: {
		...typography.bodyStrong,
		marginBottom: spacing.sm,
	},
	continueButton: {
		alignSelf: 'stretch',
		marginTop: spacing.sm,
	},
	weekRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: spacing.xs,
	},
	weekCell: {
		alignItems: 'center',
	},
	weekLabel: {
		...typography.label,
	},
	sectionLabel: {
		...typography.label,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.sm,
	},
	modeGrid: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	secondarySection: {
		marginTop: spacing.xl,
	},
	secondaryCard: {
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
	},
})
