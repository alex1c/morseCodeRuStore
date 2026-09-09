/**
 * Safe-area screen shell with themed background.
 */

import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/src/theme'

type ScreenProps = {
	children: ReactNode
	scroll?: boolean
	style?: StyleProp<ViewStyle>
	contentStyle?: StyleProp<ViewStyle>
}

export function Screen ({
	children,
	scroll = true,
	style,
	contentStyle,
}: ScreenProps) {
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()
	const padding = {
		paddingTop: insets.top + spacing.md,
		paddingBottom: insets.bottom + spacing.lg,
		paddingHorizontal: spacing.lg,
	}

	if (scroll) {
		return (
			<ScrollView
				style={[styles.flex, { backgroundColor: colors.background }, style]}
				contentContainerStyle={[padding, contentStyle]}
				keyboardShouldPersistTaps="handled"
			>
				{children}
			</ScrollView>
		)
	}

	return (
		<View
			style={[
				styles.flex,
				{ backgroundColor: colors.background },
				padding,
				style,
				contentStyle,
			]}
		>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
})
