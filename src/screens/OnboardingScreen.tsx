/**
 * First-run onboarding — short 3-step intro before the home screen.
 */

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	saveSelectedAlphabet,
	updateUserPreferences,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SelectedAlphabet } from '@/src/types'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>

type OnboardingStep = 0 | 1 | 2

const OPTIONS: {
	value: SelectedAlphabet
	title: string
	subtitle: string
}[] = [
	{
		value: 'RU',
		title: 'Русская азбука Морзе',
		subtitle: 'Кириллица для приёма и передачи',
	},
	{
		value: 'LATIN',
		title: 'Международная азбука Морзе',
		subtitle: 'Латинский алфавит (ITU)',
	},
	{
		value: 'BOTH',
		title: 'Обе',
		subtitle: 'Русская и международная вместе',
	},
]

const INTRO_BULLETS = [
	'Пошаговые уроки с постепенным уходом от визуальных подсказок',
	'Приём на слух — основной навык',
	'Передача — ритм и ключ',
	'Адаптация под ваши ошибки',
]

export function OnboardingScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { refreshPreferences } = useAppBootstrap()
	const [step, setStep] = useState<OnboardingStep>(0)
	const [selected, setSelected] = useState<SelectedAlphabet>('RU')
	const [saving, setSaving] = useState(false)

	/**
	 * Persist alphabet + onboardingCompleted, then leave onboarding.
	 * Skip paths also complete onboarding so the user is never blocked.
	 */
	const finishOnboarding = async (next: {
		goToLesson?: boolean
		alphabet?: SelectedAlphabet
	}) => {
		if (saving) {
			return
		}
		setSaving(true)
		try {
			const alphabet = next.alphabet ?? selected
			await saveSelectedAlphabet(alphabet)
			await refreshPreferences()
			if (next.goToLesson) {
				navigation.reset({
					index: 1,
					routes: [{ name: 'Home' }, { name: 'Lesson' }],
				})
			} else {
				navigation.reset({
					index: 0,
					routes: [{ name: 'Home' }],
				})
			}
		} finally {
			setSaving(false)
		}
	}

	/** Skip from welcome — mark done with current/default RU alphabet. */
	const handleSkipToHome = async () => {
		if (saving) {
			return
		}
		setSaving(true)
		try {
			await saveSelectedAlphabet(selected)
			// Belt-and-suspenders if storage already had alphabet without flag.
			await updateUserPreferences({ onboardingCompleted: true })
			await refreshPreferences()
			navigation.reset({
				index: 0,
				routes: [{ name: 'Home' }],
			})
		} finally {
			setSaving(false)
		}
	}

	if (step === 0) {
		return (
			<Screen>
				<Text style={[styles.title, { color: colors.textPrimary }]}>
					Научитесь понимать Морзе на слух
				</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
					Короткий путь от первых букв до уверенного приёма.
				</Text>

				<SurfaceCard style={styles.bulletsCard}>
					{INTRO_BULLETS.map((item) => (
						<Text
							key={item}
							style={[styles.bullet, { color: colors.textPrimary }]}
						>
							• {item}
						</Text>
					))}
				</SurfaceCard>

				<AppButton
					label="Далее"
					onPress={() => setStep(1)}
					style={styles.primary}
				/>
				<AppButton
					label={saving ? 'Сохранение…' : 'На главный экран'}
					variant="ghost"
					disabled={saving}
					onPress={() => {
						void handleSkipToHome()
					}}
					style={styles.secondary}
				/>
			</Screen>
		)
	}

	if (step === 1) {
		return (
			<Screen>
				<Text style={[styles.title, { color: colors.textPrimary }]}>
					Что хотите изучать?
				</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
					Выбор можно изменить позже в настройках.
				</Text>

				<View style={styles.options}>
					{OPTIONS.map((option) => {
						const isActive = selected === option.value
						return (
							<AppButton
								key={option.value}
								label={option.title}
								variant={isActive ? 'primary' : 'secondary'}
								onPress={() => setSelected(option.value)}
								style={styles.optionButton}
								accessibilityLabel={`${option.title}. ${option.subtitle}`}
							/>
						)
					})}
				</View>

				<SurfaceCard style={styles.hintCard}>
					<Text
						style={{
							color: colors.textSecondary,
							...typography.caption,
						}}
					>
						{OPTIONS.find((item) => item.value === selected)?.subtitle}
					</Text>
				</SurfaceCard>

				<AppButton
					label="Далее"
					onPress={() => setStep(2)}
					style={styles.primary}
				/>
				<AppButton
					label="Назад"
					variant="ghost"
					onPress={() => setStep(0)}
					style={styles.secondary}
				/>
			</Screen>
		)
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Как будем учиться
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Сначала познакомимся с символом, затем постепенно уберём
				визуальные подсказки — основной навык формируется на слух.
			</Text>

			<AppButton
				label={saving ? 'Сохранение…' : 'Начать первый урок'}
				disabled={saving}
				onPress={() => {
					void finishOnboarding({ goToLesson: true })
				}}
				style={styles.primary}
			/>
			<AppButton
				label={saving ? 'Сохранение…' : 'На главный экран'}
				variant="secondary"
				disabled={saving}
				onPress={() => {
					void finishOnboarding({ goToLesson: false })
				}}
				style={styles.secondary}
			/>
			<AppButton
				label="Назад"
				variant="ghost"
				disabled={saving}
				onPress={() => setStep(1)}
				style={styles.secondary}
			/>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.display,
		marginBottom: spacing.sm,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.xl,
	},
	bulletsCard: {
		marginBottom: spacing.xl,
		gap: spacing.sm,
	},
	bullet: {
		...typography.body,
	},
	options: {
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	optionButton: {
		alignSelf: 'stretch',
	},
	hintCard: {
		marginBottom: spacing.xl,
	},
	primary: {
		alignSelf: 'stretch',
		marginBottom: spacing.sm,
	},
	secondary: {
		alignSelf: 'stretch',
		marginBottom: spacing.sm,
	},
})
