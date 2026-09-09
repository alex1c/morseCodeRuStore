/**
 * Reusable placeholder body for screens not yet built in Phase 1.
 */

import { StyleSheet, Text } from 'react-native'

import { Screen } from '@/src/components/Screen'
import { spacing, typography, useTheme } from '@/src/theme'

type PlaceholderScreenProps = {
	title: string
	description: string
}

export function PlaceholderBody ({
	title,
	description,
}: PlaceholderScreenProps) {
	const { colors } = useTheme()
	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				{title}
			</Text>
			<Text style={[styles.body, { color: colors.textSecondary }]}>
				{description}
			</Text>
			<Text style={[styles.note, { color: colors.textTertiary }]}>
				Раздел появится в следующих фазах разработки.
			</Text>
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
		marginBottom: spacing.md,
	},
	note: {
		...typography.caption,
	},
})
