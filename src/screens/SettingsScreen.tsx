/**
 * Settings placeholder — shows persisted alphabet for Phase 1 sanity.
 */

import { useCallback, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { SurfaceCard } from '@/src/components/ui'
import { getUserPreferences } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { UserPreferences } from '@/src/types'

const ALPHABET_LABEL: Record<string, string> = {
	RU: 'Русская азбука Морзе',
	LATIN: 'Международная азбука Морзе',
	BOTH: 'Обе азбуки',
}

export function SettingsScreen () {
	const { colors } = useTheme()
	const [prefs, setPrefs] = useState<UserPreferences | null>(null)

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const next = await getUserPreferences()
				if (active) {
					setPrefs(next)
				}
			})()
			return () => {
				active = false
			}
		}, []),
	)

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Настройки
			</Text>
			<Text style={[styles.body, { color: colors.textSecondary }]}>
				Полный экран настроек появится позже. Сейчас сохранены базовые
				предпочтения Phase 1.
			</Text>
			<SurfaceCard>
				<Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
					Алфавит
				</Text>
				<Text style={[styles.rowValue, { color: colors.textPrimary }]}>
					{prefs
						? ALPHABET_LABEL[prefs.selectedAlphabet]
						: 'Загрузка…'}
				</Text>
				<Text
					style={[
						styles.rowLabel,
						styles.rowGap,
						{ color: colors.textTertiary },
					]}
				>
					Цель WPM
				</Text>
				<Text style={[styles.rowValue, { color: colors.textPrimary }]}>
					{prefs ? String(prefs.targetWpm) : '—'}
				</Text>
				<Text
					style={[
						styles.rowLabel,
						styles.rowGap,
						{ color: colors.textTertiary },
					]}
				>
					Тон
				</Text>
				<Text style={[styles.rowValue, { color: colors.textPrimary }]}>
					{prefs ? `${prefs.toneFrequencyHz} Гц` : '—'}
				</Text>
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
		marginBottom: spacing.sm,
	},
	body: {
		...typography.body,
		marginBottom: spacing.lg,
	},
	rowLabel: {
		...typography.label,
		marginBottom: spacing.xxs,
	},
	rowValue: {
		...typography.bodyStrong,
	},
	rowGap: {
		marginTop: spacing.md,
	},
})
