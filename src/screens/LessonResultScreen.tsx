import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import {
	ANALYTICS_EVENTS,
	accuracyBucket,
	mapCourse,
	sanitizeLessonId,
	trackAnalyticsEvent,
} from '@/src/analytics'
import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import { goHomeAfterResult } from '@/src/features/ads'
import { getLessonById, getSymbolById, LESSON_PASS_THRESHOLD_PERCENT } from '@/src/domain'
import type { RootStackParamList } from '@/src/navigation/types'
import { spacing, typography, useTheme } from '@/src/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'LessonResult'>

export function LessonResultScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const lesson = getLessonById(route.params.lessonId)
	const weakChars = route.params.weakSymbolIds
		.map((id) => getSymbolById(id)?.character ?? '?')
		.join(' ')

	// Privacy-safe lesson completion — buckets only, no answers.
	useEffect(() => {
		const lessonId = sanitizeLessonId(route.params.lessonId)
		trackAnalyticsEvent(ANALYTICS_EVENTS.LESSON_COMPLETED, {
			course: mapCourse(lesson?.courseId ?? 'ru-main'),
			...(lessonId ? { lesson_id: lessonId } : {}),
			score_bucket: accuracyBucket(route.params.accuracyPercent),
		})
	}, [
		lesson?.courseId,
		route.params.accuracyPercent,
		route.params.lessonId,
	])

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Урок завершён
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				{lesson?.title}
			</Text>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.score, { color: colors.textPrimary }]}>
					{route.params.correct} / {route.params.total}
				</Text>
				<Text style={[styles.percent, { color: colors.primary }]}>
					{route.params.accuracyPercent}%
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Порог прохождения: {LESSON_PASS_THRESHOLD_PERCENT}%
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					{route.params.passed
						? 'Урок засчитан и следующий открыт.'
						: 'Можно повторить, следующий урок уже доступен.'}
				</Text>
				{weakChars ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Слабее всего: {weakChars}
					</Text>
				) : null}
			</SurfaceCard>

			<View style={styles.actions}>
				<AppButton
					label="Повторить слабые символы"
					variant="secondary"
					onPress={() => navigation.replace('Lesson')}
				/>
				<AppButton
					label="Следующий урок"
					onPress={() => navigation.replace('Lesson')}
				/>
				<AppButton
					label="На главный экран"
					variant="secondary"
					onPress={() => {
						void goHomeAfterResult(navigation)
					}}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
	},
	subtitle: {
		...typography.body,
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
	percent: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
	},
	meta: {
		...typography.caption,
	},
	actions: {
		marginTop: spacing.lg,
		gap: spacing.sm,
	},
})
