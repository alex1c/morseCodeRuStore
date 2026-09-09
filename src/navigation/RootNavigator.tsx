/**
 * Root stack navigator — real routes with Phase 1 placeholder screens.
 */

import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { CourseScreen } from '@/src/screens/CourseScreen'
import { ErrorsScreen } from '@/src/screens/ErrorsScreen'
import { HomeScreen } from '@/src/screens/HomeScreen'
import { LearningScreen } from '@/src/screens/LearningScreen'
import { LessonScreen } from '@/src/screens/LessonScreen'
import { LessonResultScreen } from '@/src/screens/LessonResultScreen'
import { OnboardingScreen } from '@/src/screens/OnboardingScreen'
import { QuickPracticeScreen } from '@/src/screens/QuickPracticeScreen'
import { ReceiveScreen } from '@/src/screens/ReceiveScreen'
import { ReceiveSessionScreen } from '@/src/screens/ReceiveSessionScreen'
import { ReceiveResultScreen } from '@/src/screens/ReceiveResultScreen'
import { ReferenceScreen } from '@/src/screens/ReferenceScreen'
import { SettingsScreen } from '@/src/screens/SettingsScreen'
import { StatsScreen } from '@/src/screens/StatsScreen'
import { SymbolDetailScreen } from '@/src/screens/SymbolDetailScreen'
import { TranslatorScreen } from '@/src/screens/TranslatorScreen'
import { TransmitScreen } from '@/src/screens/TransmitScreen'
import { TransmitSessionScreen } from '@/src/screens/TransmitSessionScreen'
import { TransmitResultScreen } from '@/src/screens/TransmitResultScreen'
import { useTheme } from '@/src/theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

type RootNavigatorProps = {
	/** When false, show onboarding as the initial route. */
	onboardingCompleted: boolean
}

export function RootNavigator ({
	onboardingCompleted,
}: RootNavigatorProps) {
	const { colors, scheme } = useTheme()

	const navTheme = {
		...(scheme === 'dark' ? DarkTheme : DefaultTheme),
		colors: {
			...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
			background: colors.background,
			card: colors.surface,
			text: colors.textPrimary,
			border: colors.border,
			primary: colors.primary,
		},
	}

	return (
		<NavigationContainer theme={navTheme}>
			<Stack.Navigator
				initialRouteName={onboardingCompleted ? 'Home' : 'Onboarding'}
				screenOptions={{
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.primary,
					headerTitleStyle: { color: colors.textPrimary },
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen
					name="Onboarding"
					component={OnboardingScreen}
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="Home"
					component={HomeScreen}
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="Lesson"
					component={LessonScreen}
					options={{ title: 'Урок' }}
				/>
				<Stack.Screen
					name="LessonResult"
					component={LessonResultScreen}
					options={{ title: 'Результат урока' }}
				/>
				<Stack.Screen
					name="Receive"
					component={ReceiveScreen}
					options={{ title: 'Приём на слух' }}
				/>
				<Stack.Screen
					name="ReceiveSession"
					component={ReceiveSessionScreen}
					options={{ title: 'Тренировка' }}
				/>
				<Stack.Screen
					name="ReceiveResult"
					component={ReceiveResultScreen}
					options={{ title: 'Результат' }}
				/>
				<Stack.Screen
					name="Transmit"
					component={TransmitScreen}
					options={{ title: 'Передача' }}
				/>
				<Stack.Screen
					name="TransmitSession"
					component={TransmitSessionScreen}
					options={{ title: 'Ключ' }}
				/>
				<Stack.Screen
					name="TransmitResult"
					component={TransmitResultScreen}
					options={{ title: 'Результат' }}
				/>
				<Stack.Screen
					name="Errors"
					component={ErrorsScreen}
					options={{ title: 'Мои ошибки' }}
				/>
				<Stack.Screen
					name="SymbolDetail"
					component={SymbolDetailScreen}
					options={{ title: 'Символ' }}
				/>
				<Stack.Screen
					name="QuickPractice"
					component={QuickPracticeScreen}
					options={{ title: 'Быстрая тренировка' }}
				/>
				<Stack.Screen
					name="Course"
					component={CourseScreen}
					options={{ title: 'Курс' }}
				/>
				<Stack.Screen
					name="Stats"
					component={StatsScreen}
					options={{ title: 'Статистика' }}
				/>
				<Stack.Screen
					name="Translator"
					component={TranslatorScreen}
					options={{ title: 'Переводчик' }}
				/>
				<Stack.Screen
					name="Reference"
					component={ReferenceScreen}
					options={{ title: 'Визуальная азбука' }}
				/>
				<Stack.Screen
					name="Learning"
					component={LearningScreen}
					options={{ title: 'Обучение' }}
				/>
				<Stack.Screen
					name="Settings"
					component={SettingsScreen}
					options={{ title: 'Настройки' }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	)
}
