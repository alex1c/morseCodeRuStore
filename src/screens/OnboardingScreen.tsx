/**
 * First-run alphabet selection — short, single-screen onboarding.
 */

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import type { RootStackParamList } from '@/src/navigation/types'
import { saveSelectedAlphabet } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SelectedAlphabet } from '@/src/types'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>

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

export function OnboardingScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { refreshPreferences } = useAppBootstrap()
	const [selected, setSelected] = useState<SelectedAlphabet>('RU')
	const [saving, setSaving] = useState(false)

	const handleContinue = async () => {
		if (saving) {
			return
		}
		setSaving(true)
		try {
			await saveSelectedAlphabet(selected)
			await refreshPreferences()
			navigation.reset({
				index: 0,
				routes: [{ name: 'Home' }],
			})
		} finally {
			setSaving(false)
		}
	}

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
				<Text style={{ color: colors.textSecondary, ...typography.caption }}>
					{OPTIONS.find((item) => item.value === selected)?.subtitle}
				</Text>
			</SurfaceCard>

			<AppButton
				label={saving ? 'Сохранение…' : 'Продолжить'}
				onPress={() => {
					void handleContinue()
				}}
				disabled={saving}
				style={styles.continue}
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
	continue: {
		alignSelf: 'stretch',
	},
})
