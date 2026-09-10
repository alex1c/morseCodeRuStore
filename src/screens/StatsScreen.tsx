/**
 * Stats — today, streak, course, accuracy chart, weak, recent sessions.
 */

import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { AccuracyChart } from '@/src/components/stats/AccuracyChart'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	WEEKDAY_LABELS_RU,
	addLocalDays,
	aggregateRange,
	aggregateToday,
	computeStreakState,
	getCourseById,
	getLessonById,
	getSymbolById,
	latestSessions,
	listMasteryForAlphabet,
	listRussianLetters,
	listLatinLetters,
	listWeakForDisplay,
	localWeekdayIndex,
	toLocalDateKey,
	type SessionSummary,
	type StreakState,
	type TrainingDayAggregate,
} from '@/src/domain'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import { ensureCourseDefaults } from '@/src/features/learning/progress'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getDailyState,
	getSessionHistory,
	getSymbolStatsMap,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { LearningProgress, SymbolStatsMap } from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>

type RangeDays = 7 | 30
type SkillTab = 'receive' | 'transmit'

function formatMinutes (ms: number): string {
	if (ms <= 0) {
		return '0 мин'
	}
	const minutes = Math.max(1, Math.round(ms / 60_000))
	return `${minutes} мин`
}

function formatSessionWhen (iso: string, todayKey: string): string {
	const local = toLocalDateKey(new Date(iso))
	const time = new Date(iso)
	const hh = String(time.getHours()).padStart(2, '0')
	const mm = String(time.getMinutes()).padStart(2, '0')
	if (local === todayKey) {
		return `Сегодня ${hh}:${mm}`
	}
	if (local === addLocalDays(todayKey, -1)) {
		return `Вчера ${hh}:${mm}`
	}
	return `${local} ${hh}:${mm}`
}

function sourceLabel (session: SessionSummary): string {
	switch (session.source) {
		case 'lesson':
			return session.lessonId
				? getLessonById(session.lessonId)?.title ?? 'Урок'
				: 'Урок'
		case 'daily':
			return 'Тренировка дня'
		case 'quick':
			return 'Быстрая тренировка'
		case 'transmit':
			return 'Передача'
		case 'receive':
		default: {
			const kind = session.contentKind
			if (kind === 'word') {
				return 'Приём · Слова'
			}
			if (kind === 'group') {
				return 'Приём · Группы'
			}
			if (kind === 'phrase') {
				return 'Приём · Фразы'
			}
			if (kind === 'digits') {
				return 'Приём · Цифры'
			}
			return 'Приём'
		}
	}
}

function sessionScoreLine (session: SessionSummary): string {
	if (session.source === 'transmit') {
		return `${session.correctItems}/${session.itemCount} · ${session.itemAccuracyPercent}%`
	}
	if (
		session.characterAccuracyPercent != null &&
		session.characterTotal != null &&
		session.characterTotal > 0
	) {
		return `${session.correctItems}/${session.itemCount} · ${session.characterAccuracyPercent}% по символам`
	}
	return `${session.correctItems}/${session.itemCount} · ${session.itemAccuracyPercent}%`
}

function letterTotalForCourse (courseId: 'ru-main' | 'latin-main'): number {
	return courseId === 'ru-main'
		? listRussianLetters().length
		: listLatinLetters().length
}

function knownLettersForCourse (
	knownSymbolIds: string[],
	courseId: 'ru-main' | 'latin-main',
): number {
	const family = courseId === 'ru-main' ? 'RU' : 'LATIN'
	return knownSymbolIds.filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === family && symbol.category === 'letter'
	}).length
}

export function StatsScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [sessions, setSessions] = useState<SessionSummary[]>([])
	const [streak, setStreak] = useState<StreakState | null>(null)
	const [progress, setProgress] = useState<LearningProgress | null>(null)
	const [statsMap, setStatsMap] = useState<SymbolStatsMap>({})
	const [dailyDates, setDailyDates] = useState<string[]>([])
	const [rangeDays, setRangeDays] = useState<RangeDays>(7)
	const [skill, setSkill] = useState<SkillTab>('receive')
	const [loaded, setLoaded] = useState(false)

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [history, daily, prog, stats] = await Promise.all([
					getSessionHistory(),
					getDailyState(),
					ensureCourseDefaults(preferences.selectedAlphabet),
					getSymbolStatsMap(),
				])
				if (!active) {
					return
				}
				setSessions(history.sessions)
				setDailyDates(daily.completedDates)
				setStreak(computeStreakState(daily.completedDates))
				setProgress(prog)
				setStatsMap(stats)
				setLoaded(true)
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const todayKey = toLocalDateKey()
	const today = useMemo(
		() => aggregateToday(sessions, todayKey),
		[sessions, todayKey],
	)
	const range = useMemo(
		() => aggregateRange(sessions, rangeDays, todayKey),
		[sessions, rangeDays, todayKey],
	)
	const recent = useMemo(() => latestSessions(sessions, 5), [sessions])

	const alphabet: 'RU' | 'LATIN' =
		preferences.selectedAlphabet === 'LATIN'
			? 'LATIN'
			: preferences.selectedAlphabet === 'RU'
				? 'RU'
				: progress?.currentCourseId === 'latin-main'
					? 'LATIN'
					: 'RU'

	const mastery = useMemo(
		() => listMasteryForAlphabet(statsMap, alphabet),
		[statsMap, alphabet],
	)
	const weak = useMemo(() => listWeakForDisplay(mastery, 5), [mastery])
	const masterySummary = useMemo(() => {
		let mastered = 0
		let learning = 0
		let needsReview = 0
		for (const item of mastery) {
			if (item.insufficientData) {
				continue
			}
			if (item.tier === 'strong' || item.tier === 'stable') {
				mastered += 1
			} else if (item.tier === 'weak') {
				needsReview += 1
			} else if (item.tier === 'learning') {
				learning += 1
			}
		}
		return { mastered, learning, needsReview }
	}, [mastery])

	const chartPoints = useMemo(() => {
		return range.days.map((day: TrainingDayAggregate) => ({
			dateKey: day.dateKey,
			percent:
				skill === 'receive'
					? day.receiveCharacterAccuracyPercent
					: day.transmitAccuracyPercent,
		}))
	}, [range.days, skill])

	const chartSummary = useMemo(() => {
		const withData = chartPoints.filter((p) => p.percent != null)
		if (withData.length === 0) {
			return skill === 'receive'
				? `Точность приёма за ${rangeDays} дней: нет данных`
				: `Точность передачи за ${rangeDays} дней: нет данных`
		}
		const avg = Math.round(
			withData.reduce((sum, p) => sum + (p.percent ?? 0), 0) /
				withData.length,
		)
		const label = skill === 'receive' ? 'приёма' : 'передачи'
		return `Точность ${label} за ${rangeDays} дней: в среднем ${avg} процентов по ${withData.length} активным дням`
	}, [chartPoints, rangeDays, skill])

	const weekStrip = useMemo(() => {
		const start = addLocalDays(todayKey, -localWeekdayIndex(todayKey))
		const completed = new Set(dailyDates)
		return WEEKDAY_LABELS_RU.map((label, index) => {
			const key = addLocalDays(start, index)
			const done = completed.has(key)
			const isFuture = key > todayKey
			return {
				label,
				key,
				mark: isFuture ? '—' : done ? '✓' : '○',
				isToday: key === todayKey,
			}
		})
	}, [dailyDates, todayKey])

	const skillAccuracy =
		skill === 'receive' ? range.receive : range.transmit

	const isEmpty =
		loaded &&
		sessions.length === 0 &&
		(streak?.current ?? 0) === 0 &&
		(progress?.completedLessonIds.length ?? 0) === 0

	if (!loaded) {
		return (
			<Screen>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Загрузка…
				</Text>
			</Screen>
		)
	}

	if (isEmpty) {
		return (
			<Screen contentStyle={styles.content}>
				<SurfaceCard style={styles.card}>
					<Text style={[styles.title, { color: colors.textPrimary }]}>
						Пока нет статистики
					</Text>
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Пройдите урок или тренировку дня — здесь появятся точность,
						серия и история занятий.
					</Text>
					<AppButton
						label="На главный"
						onPress={() => navigation.navigate('Home')}
						style={styles.topGap}
					/>
				</SurfaceCard>
			</Screen>
		)
	}

	const courseId =
		(progress?.currentCourseId as 'ru-main' | 'latin-main') ?? 'ru-main'
	const course = getCourseById(courseId)
	const knownLetters = knownLettersForCourse(
		progress?.knownSymbolIds ?? [],
		courseId,
	)
	const letterTotal = letterTotalForCourse(courseId)
	const lesson = getLessonById(progress?.currentLessonId ?? '')
	const courseProgress =
		letterTotal > 0 ? knownLetters / letterTotal : 0

	const showBothCourses = preferences.selectedAlphabet === 'BOTH'

	return (
		<Screen contentStyle={styles.content}>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Сегодня
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					{formatMinutes(today.durationMs)} · сессий:{' '}
					{today.sessionCount}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Приём:{' '}
					{today.receiveCharacterAccuracyPercent == null
						? '—'
						: `${today.receiveCharacterAccuracyPercent}%`}
					{' · '}
					Передача:{' '}
					{today.transmitAccuracyPercent == null
						? '—'
						: `${today.transmitAccuracyPercent}%`}
				</Text>
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Серия
				</Text>
				<Text
					style={[styles.score, { color: colors.textPrimary }]}
					accessibilityLabel={`Серия ${streak?.current ?? 0} дней`}
				>
					🔥 {streak?.current ?? 0}{' '}
					{(streak?.current ?? 0) === 1 ? 'день' : 'дней'} подряд
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Лучший результат: {streak?.best ?? 0} дней
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
							</Text>
							<Text
								style={[
									styles.weekMark,
									{ color: colors.textPrimary },
								]}
							>
								{day.mark}
							</Text>
						</View>
					))}
				</View>
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Прогресс курса
				</Text>
				<Text style={[styles.body, { color: colors.textPrimary }]}>
					{course?.title ?? 'Курс'}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Изучено {knownLetters} / {letterTotal}
				</Text>
				<View
					style={[
						styles.progressTrack,
						{ backgroundColor: colors.surfaceMuted },
					]}
				>
					<View
						style={[
							styles.progressFill,
							{
								backgroundColor: colors.primary,
								width: `${Math.round(courseProgress * 100)}%`,
							},
						]}
					/>
				</View>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					{lesson?.title ?? 'Урок'} · уроков:{' '}
					{progress?.completedLessonIds.length ?? 0}
				</Text>
				{showBothCourses ? (
					<Text style={[styles.meta, { color: colors.textTertiary }]}>
						Международная: изучено{' '}
						{knownLettersForCourse(
							progress?.knownSymbolIds ?? [],
							'latin-main',
						)}{' '}
						/ {letterTotalForCourse('latin-main')}
					</Text>
				) : null}
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Точность
				</Text>
				<View style={styles.row}>
					<AppButton
						label="7 дней"
						variant={rangeDays === 7 ? 'primary' : 'secondary'}
						style={styles.flex}
						onPress={() => setRangeDays(7)}
					/>
					<AppButton
						label="30 дней"
						variant={rangeDays === 30 ? 'primary' : 'secondary'}
						style={styles.flex}
						onPress={() => setRangeDays(30)}
					/>
				</View>
				<View style={styles.row}>
					<AppButton
						label="Приём"
						variant={skill === 'receive' ? 'primary' : 'secondary'}
						style={styles.flex}
						onPress={() => setSkill('receive')}
					/>
					<AppButton
						label="Передача"
						variant={skill === 'transmit' ? 'primary' : 'secondary'}
						style={styles.flex}
						onPress={() => setSkill('transmit')}
					/>
				</View>
				<Text style={[styles.body, { color: colors.textPrimary }]}>
					{skillAccuracy.percent == null
						? 'Нет данных'
						: `${skillAccuracy.percent}%`}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Активных дней: {range.activeDays} · сессий:{' '}
					{range.totalSessions} · {formatMinutes(range.practiceDurationMs)}
				</Text>
				<AccuracyChart
					points={chartPoints}
					accessibilitySummary={chartSummary}
				/>
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Слабые символы
				</Text>
				{weak.length === 0 ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Пока недостаточно данных
					</Text>
				) : (
					weak.map((item) => {
						const ch = getSymbolById(item.symbolId)?.character ?? '?'
						return (
							<Text
								key={item.symbolId}
								style={[styles.meta, { color: colors.textSecondary }]}
							>
								{ch} · {item.accuracyPercent}%
							</Text>
						)
					})
				)}
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Освоение
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Освоено: {masterySummary.mastered}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					В процессе: {masterySummary.learning}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Нужно повторить: {masterySummary.needsReview}
				</Text>
			</SurfaceCard>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.section, { color: colors.accent }]}>
					Последние тренировки
				</Text>
				{recent.length === 0 ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Пока пусто
					</Text>
				) : (
					recent.map((session) => (
						<View key={session.id} style={styles.sessionRow}>
							<Text
								style={[styles.meta, { color: colors.textTertiary }]}
							>
								{formatSessionWhen(session.finishedAt, todayKey)}
							</Text>
							<Text
								style={[styles.body, { color: colors.textPrimary }]}
							>
								{sourceLabel(session)}
							</Text>
							<Text
								style={[styles.meta, { color: colors.textSecondary }]}
							>
								{sessionScoreLine(session)}
							</Text>
						</View>
					))
				)}
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
		gap: spacing.md,
	},
	card: {
		gap: spacing.xs,
	},
	section: {
		...typography.label,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.xxs,
	},
	title: {
		...typography.title,
	},
	score: {
		...typography.subtitle,
	},
	body: {
		...typography.bodyStrong,
	},
	meta: {
		...typography.caption,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
		marginTop: spacing.xs,
	},
	flex: {
		flex: 1,
	},
	topGap: {
		marginTop: spacing.md,
	},
	weekRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: spacing.sm,
	},
	weekCell: {
		alignItems: 'center',
		gap: 2,
	},
	weekLabel: {
		...typography.label,
	},
	weekMark: {
		...typography.bodyStrong,
	},
	progressTrack: {
		height: 8,
		borderRadius: 4,
		overflow: 'hidden',
		marginVertical: spacing.xs,
	},
	progressFill: {
		height: '100%',
	},
	sessionRow: {
		marginTop: spacing.xs,
		gap: 2,
	},
})
