/**
 * Design tokens for Morse Code Trainer.
 * Calm signal/telegraph palette — light primary, dark ready for later preference.
 * Avoid competitor look-alikes and decorative noise.
 */

export const spacing = {
	xxs: 4,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
} as const

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
} as const

export const typography = {
	display: {
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '700' as const,
	},
	title: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '700' as const,
	},
	subtitle: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '600' as const,
	},
	body: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '400' as const,
	},
	bodyStrong: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '600' as const,
	},
	caption: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500' as const,
	},
	label: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: '600' as const,
	},
} as const

export const elevation = {
	none: {
		shadowColor: 'transparent',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0,
		shadowRadius: 0,
		elevation: 0,
	},
	sm: {
		shadowColor: '#1B2A2E',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 3,
		elevation: 1,
	},
	md: {
		shadowColor: '#1B2A2E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
} as const

/**
 * Semantic color tokens. Prefer these over raw hex in UI code.
 * Teal-slate base with amber accent (tone / signal metaphor).
 */
export const colors = {
	light: {
		background: '#F4F7F6',
		surface: '#FFFFFF',
		surfaceMuted: '#E8EEEC',
		border: '#D2DCD8',
		textPrimary: '#1B2A2E',
		textSecondary: '#5A6F74',
		textTertiary: '#8A9DA2',
		primary: '#1F6F68',
		primaryPressed: '#175751',
		primaryMuted: '#E2F1EF',
		accent: '#C9852A',
		accentMuted: '#F8EFDF',
		warning: '#C9852A',
		warningMuted: '#F8EFDF',
		danger: '#C44B4B',
		dangerMuted: '#FBECEC',
		success: '#2A8F5B',
		successMuted: '#E6F5EE',
		overlay: 'rgba(27, 42, 46, 0.45)',
	},
	dark: {
		background: '#12181A',
		surface: '#1C2427',
		surfaceMuted: '#243034',
		border: '#334147',
		textPrimary: '#F1F5F4',
		textSecondary: '#9AADB2',
		textTertiary: '#6B7F85',
		primary: '#4DB6AC',
		primaryPressed: '#3D9A91',
		primaryMuted: '#1A3331',
		accent: '#E0A84A',
		accentMuted: '#3A2E18',
		warning: '#E0A84A',
		warningMuted: '#3A2E18',
		danger: '#F07171',
		dangerMuted: '#3A1F1F',
		success: '#4CAF7A',
		successMuted: '#1A3326',
		overlay: 'rgba(0, 0, 0, 0.55)',
	},
} as const

export type ColorSchemeName = 'light' | 'dark'

/** Shared semantic palette shape for light/dark token sets. */
export type ThemeColors = {
	background: string
	surface: string
	surfaceMuted: string
	border: string
	textPrimary: string
	textSecondary: string
	textTertiary: string
	primary: string
	primaryPressed: string
	primaryMuted: string
	accent: string
	accentMuted: string
	warning: string
	warningMuted: string
	danger: string
	dangerMuted: string
	success: string
	successMuted: string
	overlay: string
}

/** Minimum Android-friendly touch target size (dp). */
export const touchTarget = {
	min: 48,
} as const
