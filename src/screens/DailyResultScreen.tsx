/**
 * Daily training result — educational tone (Phase 8 §27).
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	buildAdaptiveSessionPool,
	getSymbolById,
	selectWeakSymbolPool,
} from '@/src/domain'
import { buildDailyLaunch } from '@/src/features/daily'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getReceiveSettings,
	getSymbolStatsMap,
} from '@/src/storage'
import { wallTimeMs } from '@/src/utils/clock'
import { spacing, typography, useTheme } from '@/src/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'DailyResult'>

function formatDuration (ms: number): string {
	const minutes = Math.max(1, Math.round(ms / 60_000))
	return `${minutes} мин`
}

export function DailyResultScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const { result, settings, durationMs, streak, planMixSummary } =
		route.params

	const strong = result.strongSymbolIds
		.map((id) => getSymbolById(id)?.character ?? '?')
		.join(', ')
	const review = result.errorCounts
		.slice(0, 5)
		.map((item) => getSymbolById(item.symbolId)?.character ?? '?')
		.join(', ')

	const restartDaily = async () => {
		const [stats, progress, receive] = await Promise.all([
			getSymbolStatsMap(),
			getLearningProgress(),
			getReceiveSettings(),
		])
		const alphabet =
			preferences.selectedAlphabet === 'LATIN'
				? 'LATIN'
				: preferences.selectedAlphabet === 'RU'
					? 'RU'
					: settings.alphabet
		const launch = buildDailyLaunch({
			alphabet,
			knownSymbolIds: progress.knownSymbolIds,
			statsMap: stats,
			receiveBase: receive,
		})
		navigation.replace('ReceiveSession', {
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

	const trainWeak = async () => {
		const [stats, progress, receive] = await Promise.all([
			getSymbolStatsMap(),
			getLearningProgress(),
			getReceiveSettings(),
		])
		const alphabet = settings.alphabet
		const pool = selectWeakSymbolPool({
			statsMap: stats,
			alphabet,
			knownSymbolIds: progress.knownSymbolIds,
		})
		if (!pool.hasEnoughData) {
			navigation.navigate('Errors')
			return
		}
		const plan = buildAdaptiveSessionPool({
			statsMap: stats,
			alphabet,
			knownSymbolIds: progress.knownSymbolIds,
		})
		const launch = buildReceiveLaunch({
			alphabet,
			symbolPool:
				pool.symbolIds.length > 0 ? pool.symbolIds : plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: { ...receive, symbolPreset: 'weak' },
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.replace('ReceiveSession', {
			...launch,
			sessionSource: 'receive',
			sessionStartedAtMs: wallTimeMs(),
		})
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Тренировка дня завершена
			</Text>
			<Text style={[styles.mix, { color: colors.textSecondary }]}>
				{planMixSummary}
			</Text>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.score, { color: colors.textPrimary }]}>
					{result.correct} / {result.total}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Точность по символам: {result.characterAccuracyPercent}%
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					{formatDuration(durationMs)}
				</Text>
				{strong ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Сегодня лучше всего:{'\n'}
						{strong}
					</Text>
				) : null}
				{review ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Повторить завтра:{'\n'}
						{review}
					</Text>
				) : null}
				<Text
					style={[styles.streak, { color: colors.primary }]}
					accessibilityLabel={`Серия ${streak.current} дней`}
				>
					🔥 Серия: {streak.current}{' '}
					{streak.current === 1 ? 'день' : 'дней'}
				</Text>
				{streak.best > 0 ? (
					<Text style={[styles.meta, { color: colors.textTertiary }]}>
						Лучший результат: {streak.best} дней
					</Text>
				) : null}
			</SurfaceCard>

			<View style={styles.actions}>
				<AppButton
					label="Повторить тренировку"
					onPress={() => {
						void restartDaily()
					}}
				/>
				<AppButton
					label="Тренировать слабые"
					variant="secondary"
					onPress={() => {
						void trainWeak()
					}}
				/>
				<AppButton
					label="На главный"
					variant="secondary"
					onPress={() => navigation.navigate('Home')}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	mix: {
		...typography.caption,
		marginBottom: spacing.md,
	},
	card: {
		gap: spacing.xs,
	},
	score: {
		fontSize: 34,
		lineHeight: 40,
		fontWeight: '700',
	},
	meta: {
		...typography.caption,
	},
	streak: {
		...typography.subtitle,
		marginTop: spacing.sm,
	},
	actions: {
		marginTop: spacing.lg,
		gap: spacing.sm,
	},
})
