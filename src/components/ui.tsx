/**
 * Shared presentational UI primitives for Phase 1 screens.
 */

import type { ReactNode } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	type StyleProp,
	type ViewStyle,
} from 'react-native'

import {
	elevation,
	radius,
	spacing,
	touchTarget,
	typography,
	useTheme,
} from '@/src/theme'

type ButtonProps = {
	label: string
	onPress: () => void
	variant?: 'primary' | 'secondary' | 'ghost'
	disabled?: boolean
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppButton ({
	label,
	onPress,
	variant = 'primary',
	disabled = false,
	accessibilityLabel,
	style,
}: ButtonProps) {
	const { colors } = useTheme()
	const isPrimary = variant === 'primary'
	const isSecondary = variant === 'secondary'

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.buttonBase,
				{
					backgroundColor: isPrimary
						? colors.primary
						: isSecondary
							? colors.surface
							: 'transparent',
					borderColor: isSecondary ? colors.border : 'transparent',
					borderWidth: isSecondary ? 1.5 : 0,
					opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
				},
				style,
			]}
		>
			<Text
				style={[
					styles.buttonLabel,
					{
						color: isPrimary
							? '#FFFFFF'
							: colors.textPrimary,
					},
				]}
			>
				{label}
			</Text>
		</Pressable>
	)
}

type CardProps = {
	children: ReactNode
	style?: StyleProp<ViewStyle>
}

export function SurfaceCard ({ children, style }: CardProps) {
	const { colors } = useTheme()
	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: colors.surface },
				style,
			]}
		>
			{children}
		</View>
	)
}

type ModeCardProps = {
	title: string
	subtitle: string
	onPress: () => void
	accessibilityLabel?: string
}

/** Compact interactive card for primary practice modes on Home. */
export function ModeCard ({
	title,
	subtitle,
	onPress,
	accessibilityLabel,
}: ModeCardProps) {
	const { colors } = useTheme()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? title}
			onPress={onPress}
			style={({ pressed }) => [
				styles.modeCard,
				{
					backgroundColor: colors.surface,
					borderColor: colors.border,
					opacity: pressed ? 0.92 : 1,
				},
			]}
		>
			<Text style={[styles.modeTitle, { color: colors.textPrimary }]}>
				{title}
			</Text>
			<Text
				style={[styles.modeSubtitle, { color: colors.textSecondary }]}
			>
				{subtitle}
			</Text>
		</Pressable>
	)
}

type SecondaryLinkProps = {
	label: string
	onPress: () => void
}

/** Textual secondary navigation row (course, stats, settings, …). */
export function SecondaryLink ({ label, onPress }: SecondaryLinkProps) {
	const { colors } = useTheme()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={({ pressed }) => [
				styles.secondaryLink,
				{
					backgroundColor: pressed
						? colors.surfaceMuted
						: 'transparent',
				},
			]}
		>
			<Text
				style={[styles.secondaryLabel, { color: colors.textPrimary }]}
			>
				{label}
			</Text>
			<Text style={{ color: colors.textTertiary, fontSize: 18 }}>
				›
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	buttonBase: {
		minHeight: touchTarget.min + 4,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	buttonLabel: {
		...typography.bodyStrong,
	},
	card: {
		borderRadius: radius.lg,
		padding: spacing.lg,
		...elevation.sm,
	},
	modeCard: {
		flex: 1,
		minHeight: 96,
		borderRadius: radius.lg,
		borderWidth: 1,
		padding: spacing.md,
		justifyContent: 'center',
		...elevation.sm,
	},
	modeTitle: {
		...typography.bodyStrong,
		marginBottom: spacing.xxs,
	},
	modeSubtitle: {
		...typography.caption,
	},
	secondaryLink: {
		minHeight: touchTarget.min,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xs,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: radius.sm,
	},
	secondaryLabel: {
		...typography.body,
	},
})
