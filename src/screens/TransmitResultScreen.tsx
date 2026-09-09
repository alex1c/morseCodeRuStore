/**
 * Transmit session result summary.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	getSymbolById,
	timingSummaryLabelRu,
} from '@/src/domain'
import {
	buildTransmitErrorFocusPool,
} from '@/src/features/transmit'
import type { RootStackParamList } from '@/src/navigation/types'
import { getLearningProgress } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'TransmitResult'>

export function TransmitResultScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const { result, settings, symbolPool } = route.params

	const errors = result.errorCounts
		.map((item) => {
			const ch = getSymbolById(item.symbolId)?.character ?? '?'
			return `${ch} — ${item.count}`
		})
		.join('\n')

	const retryErrors = async () => {
		if (result.errorCounts.length === 0) {
			navigation.navigate('Transmit')
			return
		}
		const progress = await getLearningProgress()
		const focus = buildTransmitErrorFocusPool(
			result.errorCounts.map((item) => item.symbolId),
			settings.alphabet,
			progress.knownSymbolIds,
		)
		navigation.replace('TransmitSession', {
			settings: {
				...settings,
				symbolPreset: 'custom',
				customSymbolIds: focus.symbolIds,
				sessionLength: Math.min(
					20,
					Math.max(10, focus.symbolIds.length * 4),
				) as 10 | 20 | 50,
			},
			symbolPool: focus.symbolIds,
			seed: wallTimeMs() % 1_000_000,
			weights: focus.weights,
		})
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Передача завершена
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.score, { color: colors.textPrimary }]}>
					{result.correct} / {result.total} правильно
				</Text>
				<Text style={[styles.percent, { color: colors.primary }]}>
					{result.accuracyPercent}%
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Ритм: {timingSummaryLabelRu(result.timingSummary)}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Подсказки: {result.hintsUsed}
				</Text>
				{errors ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Сложнее всего:{'\n'}
						{errors}
					</Text>
				) : null}
			</SurfaceCard>

			<View style={styles.actions}>
				<AppButton
					label="Ещё раз"
					onPress={() => {
						navigation.replace('TransmitSession', {
							settings,
							symbolPool,
							seed: wallTimeMs() % 1_000_000,
						})
					}}
				/>
				{result.errorCounts.length > 0 ? (
					<AppButton
						label="Тренировать ошибки"
						variant="secondary"
						onPress={() => {
							void retryErrors()
						}}
					/>
				) : null}
				<AppButton
					label="Изменить настройки"
					variant="secondary"
					onPress={() => navigation.navigate('Transmit')}
				/>
				<AppButton
					label="На главный экран"
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
		marginBottom: spacing.md,
	},
	card: {
		gap: spacing.xs,
	},
	score: {
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '700',
	},
	percent: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
	},
	meta: {
		...typography.caption,
	},
	actions: {
		marginTop: spacing.md,
		gap: spacing.sm,
	},
})
