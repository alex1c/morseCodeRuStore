import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import { COURSES, getSymbolById, type CourseId } from '@/src/domain'
import {
	chooseCurrentCourse,
	ensureCourseDefaults,
} from '@/src/features/learning/progress'
import type { RootStackParamList } from '@/src/navigation/types'
import { getLearningProgress, saveLearningProgress } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'

type Props = NativeStackScreenProps<RootStackParamList, 'Course'>

export function CourseScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [courseId, setCourseId] = useState<CourseId>('ru-main')
	const [unlocked, setUnlocked] = useState<string[]>([])
	const [completed, setCompleted] = useState<string[]>([])
	const [bestScore, setBestScore] = useState<Record<string, number>>({})

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const progress = await ensureCourseDefaults(preferences.selectedAlphabet)
				if (!active) {
					return
				}
				setCourseId(progress.currentCourseId as CourseId)
				setUnlocked(progress.unlockedLessonIds)
				setCompleted(progress.completedLessonIds)
				setBestScore(progress.bestLessonScorePercentById)
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const currentCourse = useMemo(
		() => COURSES.find((course) => course.id === courseId) ?? COURSES[0],
		[courseId],
	)

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Курс обучения
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Постепенное добавление: буквы → группы и слова → цифры.
			</Text>
			<View style={styles.switcher}>
				<AppButton
					label="Русский"
					variant={courseId === 'ru-main' ? 'primary' : 'secondary'}
					onPress={() => {
						void chooseCurrentCourse('ru-main')
						setCourseId('ru-main')
					}}
					style={styles.switchButton}
				/>
				<AppButton
					label="Latin"
					variant={courseId === 'latin-main' ? 'primary' : 'secondary'}
					onPress={() => {
						void chooseCurrentCourse('latin-main')
						setCourseId('latin-main')
					}}
					style={styles.switchButton}
				/>
			</View>
			<AppButton
				label="Визуальная азбука"
				variant="secondary"
				onPress={() => navigation.navigate('Reference')}
			/>

			<View style={styles.list}>
				{currentCourse.lessons.map((lesson) => {
					const isDone = completed.includes(lesson.id)
					const isUnlocked = unlocked.includes(lesson.id) || isDone
					const status = isDone
						? 'Завершён'
						: isUnlocked
							? 'Доступен'
							: 'Закрыт'
					const newChars = lesson.newSymbolIds
						.map((id) => getSymbolById(id)?.character ?? '?')
						.join(' ')
					return (
						<SurfaceCard key={lesson.id} style={styles.lessonCard}>
							<Text style={[styles.lessonTitle, { color: colors.textPrimary }]}>
								{lesson.title}
							</Text>
							<Text style={[styles.meta, { color: colors.textSecondary }]}>
								Раздел: {lesson.group}
							</Text>
							<Text style={[styles.meta, { color: colors.textSecondary }]}>
								Новые символы: {newChars}
							</Text>
							<Text style={[styles.meta, { color: colors.textSecondary }]}>
								Статус: {status}
							</Text>
							{bestScore[lesson.id] != null ? (
								<Text style={[styles.meta, { color: colors.textSecondary }]}>
									Лучший результат: {bestScore[lesson.id]}%
								</Text>
							) : null}
							<AppButton
								label={isDone ? 'Пройти снова' : 'Открыть урок'}
								disabled={!isUnlocked}
								onPress={async () => {
									const progress = await getLearningProgress()
									const next = {
										...progress,
										currentCourseId: currentCourse.id,
										currentLessonId: lesson.id,
									}
									await chooseCurrentCourse(currentCourse.id)
									await saveLearningProgress(next)
									navigation.navigate('Lesson')
								}}
							/>
						</SurfaceCard>
					)
				})}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.md,
	},
	switcher: {
		flexDirection: 'row',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	switchButton: {
		flex: 1,
	},
	list: {
		marginTop: spacing.md,
		gap: spacing.md,
	},
	lessonCard: {
		gap: spacing.xs,
	},
	lessonTitle: {
		...typography.subtitle,
	},
	meta: {
		...typography.caption,
	},
})
