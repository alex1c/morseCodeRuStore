/**
 * App bootstrap context — loads preferences once and exposes refresh.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import {
	DEFAULT_USER_PREFERENCES,
	getUserPreferences,
} from '@/src/storage'
import { colors } from '@/src/theme'
import type { UserPreferences } from '@/src/types'

type AppBootstrapValue = {
	preferences: UserPreferences
	ready: boolean
	refreshPreferences: () => Promise<void>
}

const AppBootstrapContext = createContext<AppBootstrapValue>({
	preferences: DEFAULT_USER_PREFERENCES,
	ready: false,
	refreshPreferences: async () => undefined,
})

type AppBootstrapProviderProps = {
	children: ReactNode
}

export function AppBootstrapProvider ({
	children,
}: AppBootstrapProviderProps) {
	const [preferences, setPreferences] = useState<UserPreferences>(
		DEFAULT_USER_PREFERENCES,
	)
	const [ready, setReady] = useState(false)

	const refreshPreferences = useCallback(async () => {
		const next = await getUserPreferences()
		setPreferences(next)
	}, [])

	useEffect(() => {
		let cancelled = false
		void (async () => {
			try {
				const next = await getUserPreferences()
				if (!cancelled) {
					setPreferences(next)
				}
			} catch {
				// Missing / corrupt storage must not block cold start.
				if (!cancelled) {
					setPreferences({ ...DEFAULT_USER_PREFERENCES })
				}
			} finally {
				if (!cancelled) {
					setReady(true)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const value = useMemo(
		() => ({
			preferences,
			ready,
			refreshPreferences,
		}),
		[preferences, ready, refreshPreferences],
	)

	if (!ready) {
		return (
			<View style={styles.boot}>
				<ActivityIndicator size="large" color={colors.light.primary} />
			</View>
		)
	}

	return (
		<AppBootstrapContext.Provider value={value}>
			{children}
		</AppBootstrapContext.Provider>
	)
}

export function useAppBootstrap (): AppBootstrapValue {
	return useContext(AppBootstrapContext)
}

const styles = StyleSheet.create({
	boot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.light.background,
	},
})
