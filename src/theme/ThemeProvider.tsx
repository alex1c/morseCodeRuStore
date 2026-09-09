/**
 * Theme context — resolves light/dark from user preference + system scheme.
 * Architecture is dark-ready; Phase 1 UI primarily ships light defaults.
 */

import {
	createContext,
	useContext,
	useMemo,
	type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'

import type { ThemePreference } from '@/src/types/preferences'
import {
	colors,
	type ColorSchemeName,
	type ThemeColors,
} from './tokens'

type ThemeContextValue = {
	scheme: ColorSchemeName
	colors: ThemeColors
}

const ThemeContext = createContext<ThemeContextValue>({
	scheme: 'light',
	colors: colors.light,
})

type ThemeProviderProps = {
	preference: ThemePreference
	children: ReactNode
}

/**
 * Resolve effective scheme from preference and OS setting.
 */
export function resolveColorScheme (
	preference: ThemePreference,
	systemScheme: ColorSchemeName | null | undefined,
): ColorSchemeName {
	if (preference === 'light' || preference === 'dark') {
		return preference
	}
	return systemScheme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider ({
	preference,
	children,
}: ThemeProviderProps) {
	const systemScheme = useColorScheme()
	const value = useMemo(() => {
		const scheme = resolveColorScheme(
			preference,
			systemScheme === 'dark' ? 'dark' : 'light',
		)
		return {
			scheme,
			colors: colors[scheme],
		}
	}, [preference, systemScheme])

	return (
		<ThemeContext.Provider value={value}>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme (): ThemeContextValue {
	return useContext(ThemeContext)
}
