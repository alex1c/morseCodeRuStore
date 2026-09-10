/**
 * Root application entry — theme + bootstrap + navigation.
 */

import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import {
	AppBootstrapProvider,
	useAppBootstrap,
} from '@/src/features/bootstrap/AppBootstrap'
import { TorchHost } from '@/src/features/morseOutput'
import { RootNavigator } from '@/src/navigation'
import { ThemeProvider } from '@/src/theme'

function AppShell () {
	const { preferences } = useAppBootstrap()

	return (
		<ThemeProvider preference={preferences.themePreference}>
			<StatusBar style="auto" />
			{/* Remount stack when onboarding flips so initial route stays correct. */}
			<RootNavigator
				key={preferences.onboardingCompleted ? 'main' : 'onboarding'}
				onboardingCompleted={preferences.onboardingCompleted}
			/>
			{/* Off-screen camera host for flashlight Morse (permission on demand). */}
			<TorchHost />
		</ThemeProvider>
	)
}

export default function App () {
	return (
		<SafeAreaProvider>
			<AppBootstrapProvider>
				<AppShell />
			</AppBootstrapProvider>
		</SafeAreaProvider>
	)
}
